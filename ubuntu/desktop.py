#!/usr/bin/python3
"""GNOME host for LazyingArt readers. Each package ships independently."""
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import secrets
import sys
import threading
import time
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("WebKit", "6.0")
gi.require_version("Soup", "3.0")
from gi.repository import Adw, Gio, GLib, Gtk, Soup, WebKit

DOWNLOADS = "https://lazying.art/downloads/ubuntu/"
PROOF = re.compile(r"[A-Za-z0-9_-]{43}")
SESSION = re.compile(r"(?:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}){2}")
LANGUAGES = {
    "ja": ["戻る", "ライブラリ", "更新", "メニュー", "文字を拡大", "文字を縮小", "標準の大きさ", "全画面", "更新を確認", "接続できません", "もう一度試す"],
    "zh": ["返回", "书库", "刷新", "菜单", "放大", "缩小", "恢复大小", "全屏", "检查更新", "无法连接", "重试"],
    "zh-Hant": ["返回", "書庫", "重新整理", "選單", "放大", "縮小", "恢復大小", "全螢幕", "檢查更新", "無法連線", "重試"],
}
ENGLISH = ["Back", "Library", "Refresh", "Menu", "Zoom In", "Zoom Out", "Actual Size", "Full Screen", "Check for Updates", "Couldn’t connect", "Try Again"]


def translations():
    tag = GLib.get_language_names()[0].replace("_", "-").lower()
    if tag.startswith(("zh-tw", "zh-hk", "zh-mo", "zh-hant")):
        return LANGUAGES["zh-Hant"]
    return LANGUAGES.get(tag.split("-")[0], ENGLISH)


def secure_url(url):
    try:
        parts = urlsplit(url)
        if (parts.scheme == "https" and parts.hostname and parts.port in (None, 443)
                and parts.username is None and parts.password is None and not any(c.isspace() for c in url)):
            return parts
    except ValueError:
        pass
    return None


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def get_json(url, payload=None):
    if not secure_url(url):
        raise ValueError("HTTPS required")
    headers = {"Accept": "application/json", "Cache-Control": "no-cache"}
    if payload is not None:
        headers.update({"Content-Type": "application/json", "Origin": "capacitor://localhost",
                        "X-OnlyIdeas-Client": "native"})
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    with build_opener(NoRedirect()).open(request, timeout=10) as response:
        raw = response.read(65537)
    if len(raw) > 65536:
        raise ValueError("Response too large")
    return json.loads(raw)


def version_key(version, build):
    if not re.fullmatch(r"\d{1,8}(?:\.\d{1,8}){2}", version) or type(build) is not int or not 1 <= build < 10**8:
        raise ValueError("Invalid desktop version")
    return (*map(int, version.split(".")), build)


def login_url(url, host, method, flow):
    parts = secure_url(url)
    if not parts or parts.hostname != host or parts.fragment or not PROOF.fullmatch(flow):
        return False
    if method == "github":
        return parts.path == "/api/auth/github" and parts.query == "flow=" + flow
    query = parse_qs(parts.query, strict_parsing=True)
    return (parts.path == "/api/auth/lazyingart" and list(query) == ["ticket"]
            and len(query["ticket"]) == 1 and PROOF.fullmatch(query["ticket"][0]) is not None)


class DesktopApp(Adw.Application):
    def __init__(self, config, *, workspace=None, ephemeral=False):
        super().__init__(application_id=config["id"],
                         flags=Gio.ApplicationFlags.HANDLES_OPEN | (Gio.ApplicationFlags.NON_UNIQUE if ephemeral else Gio.ApplicationFlags.DEFAULT_FLAGS))
        self.config = config
        self.ephemeral = ephemeral
        self.home = config["home"]
        origin = secure_url(self.home)
        self.host, self.scope = origin.hostname, origin.path
        slug = config["slug"]
        self.data = Path(workspace or GLib.get_user_data_dir()) / "LazyingArt" / slug
        self.cache = Path(workspace or GLib.get_user_cache_dir()) / "LazyingArt" / slug
        self.window = None
        self.popups = []
        self.downloads = {}
        self.jobs = ThreadPoolExecutor(max_workers=2, thread_name_prefix=slug)
        self.sign_in = None
        self.auth_cancel = None
        self.checking = False
        self.labels = translations()
        self.settings = {}
        try:
            self.settings = json.loads((self.data / "desktop.json").read_text())
            if not isinstance(self.settings, dict):
                self.settings = {}
        except (OSError, ValueError):
            pass

    def allows(self, uri):
        parts = secure_url(uri)
        if not parts or parts.hostname != self.host:
            return False
        path = unquote(parts.path)
        return "\\" not in path and not any(item in (".", "..") for item in path.split("/")) and (
            path == self.scope.rstrip("/") or path.startswith(self.scope))

    def persist(self):
        if self.ephemeral:
            return
        try:
            staging = self.data / "desktop.json.tmp"
            staging.write_text(json.dumps(self.settings))
            staging.replace(self.data / "desktop.json")
        except OSError:
            pass

    def do_startup(self):
        Adw.Application.do_startup(self)
        actions = [
            ("back", self.back, ["<Alt>Left"]), ("home", self.go_home, ["<Alt>Home"]),
            ("refresh", self.refresh, ["<Primary>r", "F5"]),
            ("zoom-in", lambda: self.zoom(.1), ["<Primary>plus", "<Primary>equal"]),
            ("zoom-out", lambda: self.zoom(-.1), ["<Primary>minus"]),
            ("actual-size", lambda: self.zoom(None), ["<Primary>0"]),
            ("fullscreen", self.fullscreen, ["F11"]),
            ("updates", self.check_updates, []), ("about", self.about, []),
        ]
        if self.config.get("onlyideas"):
            actions.extend([("github", lambda: self.start_login("github"), []),
                            ("cancel-login", self.cancel_login, [])])
        for name, callback, shortcuts in actions:
            action = Gio.SimpleAction.new(name, None)
            action.connect("activate", lambda _, __, callback=callback: callback())
            self.add_action(action)
            self.set_accels_for_action("app." + name, shortcuts)
        preference = self.settings.get("theme", "system")
        if preference not in ("system", "light", "dark"):
            preference = "system"
        appearance = Gio.SimpleAction.new_stateful("theme", GLib.VariantType.new("s"), GLib.Variant("s", preference))
        appearance.connect("activate", self.theme_changed)
        self.add_action(appearance)
        self.apply_theme(preference)

    @staticmethod
    def apply_theme(preference):
        styles = {"light": Adw.ColorScheme.FORCE_LIGHT, "dark": Adw.ColorScheme.FORCE_DARK}
        Adw.StyleManager.get_default().set_color_scheme(styles.get(preference, Adw.ColorScheme.DEFAULT))

    def theme_changed(self, action, parameter):
        theme = parameter.get_string()
        if theme not in ("system", "light", "dark"):
            return
        action.set_state(parameter)
        self.apply_theme(theme)
        self.settings["theme"] = theme
        self.persist()

    def do_activate(self):
        if self.window:
            self.window.present()
            return
        app = self.config
        for path in (self.data, self.cache):
            path.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.session = (WebKit.NetworkSession.new_ephemeral() if self.ephemeral
                        else WebKit.NetworkSession.new(str(self.data / "web"), str(self.cache / "web")))
        if not self.ephemeral:
            self.session.get_cookie_manager().set_persistent_storage(
                str(self.data / "cookies.sqlite"), WebKit.CookiePersistentStorage.SQLITE)
        self.session.connect("download-started", self.start_download)
        self.web = WebKit.WebView(network_session=self.session)
        self.configure_web(self.web)
        self.web.connect("decide-policy", self.policy)
        self.web.connect("create", self.popup)
        self.web.connect("load-changed", self.load_changed)
        self.web.connect("load-failed", self.load_failed)
        self.web.connect("web-process-terminated", lambda *_: self.error_page())
        self.web.connect("load-failed-with-tls-errors", self.tls_failed)
        if app.get("onlyideas"):
            self.web.connect("resource-load-started", self.resource_started)
        try:
            self.web.set_zoom_level(max(.7, min(2.5, float(self.settings.get("zoom", 1)))))
        except (ValueError, TypeError):
            pass

        self.window = Adw.ApplicationWindow(application=self, title=app["name"], default_width=1200, default_height=860)
        self.window.set_size_request(360, 460)
        self.window.connect("close-request", self.close_window)
        self.toasts = Adw.ToastOverlay()
        self.toolbar = Adw.ToolbarView()
        self.toasts.set_child(self.toolbar)
        self.window.set_content(self.toasts)
        header = Adw.HeaderBar()
        brand = Gtk.Box(spacing=7)
        brand.set_valign(Gtk.Align.CENTER)
        icon = Gtk.Image.new_from_icon_name(app["id"])
        icon.set_pixel_size(19)
        brand.append(icon)
        title = Gtk.Label(label=app["name"])
        title.add_css_class("heading")
        brand.append(title)
        header.set_title_widget(brand)
        self.toolbar.add_top_bar(header)
        for icon, label, action in [("go-previous-symbolic", self.labels[0], "back"),
                                    ("go-home-symbolic", self.labels[1], "home"),
                                    ("view-refresh-symbolic", self.labels[2], "refresh")]:
            button = Gtk.Button.new_from_icon_name(icon)
            button.set_tooltip_text(label)
            button.update_property([Gtk.AccessibleProperty.LABEL], [label])
            button.set_action_name("app." + action)
            header.pack_start(button)
        menu = Gio.Menu()
        view = Gio.Menu()
        for index, action in [(4, "zoom-in"), (5, "zoom-out"), (6, "actual-size"), (7, "fullscreen")]:
            view.append(self.labels[index], "app." + action)
        menu.append_section(None, view)
        theme = Gio.Menu()
        for label, target in [("System", "system"), ("Light", "light"), ("Dark", "dark")]:
            item = Gio.MenuItem.new(label)
            item.set_action_and_target_value("app.theme", GLib.Variant("s", target))
            theme.append_item(item)
        menu.append_submenu("Appearance", theme)
        if app.get("onlyideas"):
            account = Gio.Menu()
            account.append("Sign in with GitHub", "app.github")
            account.append("Cancel Sign-In", "app.cancel-login")
            menu.append_section(None, account)
            self.lookup_action("cancel-login").set_enabled(False)
        help_menu = Gio.Menu()
        help_menu.append(self.labels[8], "app.updates")
        help_menu.append("About " + app["name"], "app.about")
        menu.append_section(None, help_menu)
        button = Gtk.MenuButton(icon_name="open-menu-symbolic", menu_model=menu, tooltip_text=self.labels[3])
        header.pack_end(button)
        self.content = Gtk.Stack(transition_type=Gtk.StackTransitionType.CROSSFADE)
        self.content.add_named(self.web, "reader")
        status = Adw.StatusPage(icon_name="network-offline-symbolic", title=self.labels[9])
        retry = Gtk.Button(label=self.labels[10], halign=Gtk.Align.CENTER)
        retry.add_css_class("suggested-action")
        retry.add_css_class("pill")
        retry.connect("clicked", lambda _: self.retry())
        status.set_child(retry)
        self.content.add_named(status, "error")
        self.toolbar.set_content(self.content)
        self.window.present()
        self.go_home()

    def do_open(self, files, hint):
        self.activate()
        for item in files:
            uri = item.get_uri()
            if self.allows(uri) and not urlsplit(uri).path.startswith("/api/"):
                self.web.load_uri(uri)
            elif self.config["slug"] == "bunko":
                book = re.fullmatch(r"art\.lazying\.bunko://book/([a-z0-9-]{1,120})/?", uri)
                if book:
                    self.web.load_uri(self.home + "?book=" + book[1])

    @staticmethod
    def configure_web(web):
        settings = web.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_media_stream(False)
        web.connect("permission-request", lambda _, request: request.deny() or True)

    def tls_failed(self, _, uri, certificate, flags):
        self.failed_uri = uri if self.allows(uri) else self.home
        self.error_page()
        return True

    def resource_started(self, _, resource, request):
        uri = request.get_uri()
        if self.sign_in is not None and self.allows(uri) and urlsplit(uri).path in ("/api/logout", "/api/auth/logout"):
            self.cancel_login()

    def policy(self, web, decision, kind):
        if kind == WebKit.PolicyDecisionType.RESPONSE:
            if not decision.is_mime_type_supported() and decision.is_main_frame_main_resource():
                target = decision.get_request().get_uri()
                if self.allows(target.removeprefix("blob:")):
                    decision.download()
                else:
                    decision.ignore()
                return True
            return False
        action = decision.get_navigation_action()
        uri = action.get_request().get_uri()
        parts = secure_url(uri)
        if kind == WebKit.PolicyDecisionType.NAVIGATION_ACTION and self.allows(uri):
            if self.config.get("onlyideas") and parts.path in ("/api/auth/github", "/api/auth/lazyingart"):
                decision.ignore()
                self.start_login("github" if parts.path.endswith("github") else "lazyingart")
                return True
            return False
        if uri.startswith("blob:") and self.allows(uri[5:]):
            return False
        decision.ignore()
        if action.is_user_gesture() and parts:
            self.open_external(uri)
        return True

    def popup(self, web, action):
        uri = action.get_request().get_uri()
        if not action.is_user_gesture():
            return None
        if uri != "about:blank":
            if self.allows(uri) and self.config.get("onlyideas") and urlsplit(uri).path == "/api/auth/github":
                self.start_login("github")
            else:
                self.open_external(uri)
            return None
        if len(self.popups) >= 2:
            return None
        popup = WebKit.WebView(related_view=web)
        self.configure_web(popup)
        popup.connect("load-failed-with-tls-errors", lambda *_: True)
        self.popups.append(popup)
        expiry = GLib.timeout_add_seconds(660, lambda: self.expire_popup(popup))

        def close(_):
            if popup in self.popups:
                self.popups.remove(popup)
                GLib.source_remove(expiry)

        def decide(_, decision, kind):
            if kind != WebKit.PolicyDecisionType.NAVIGATION_ACTION:
                decision.ignore()
                return True
            target = decision.get_navigation_action().get_request().get_uri()
            if target == "about:blank":
                return False
            decision.ignore()
            if self.allows_popup(target):
                self.open_external(target)
                self.toast("Finish in your browser, then return here.")
            return True

        popup.connect("close", close)
        popup.connect("decide-policy", decide)
        return popup

    def expire_popup(self, popup):
        if popup in self.popups:
            self.popups.remove(popup)
        return GLib.SOURCE_REMOVE

    def allows_popup(self, uri):
        parts = secure_url(uri)
        if not parts or parts.fragment:
            return False
        if self.config.get("onlyideas"):
            return self.allows(uri) and parts.path in ("/api/auth/github", "/api/auth/lazyingart")
        return (parts.hostname == "github.com" and parts.path == "/login/oauth/authorize"
                or parts.hostname in ("bunko.lazying.art", "llm.lazying.art") and parts.path in
                ("/bunko/oauth/lazyingart", "/bunko/oauth/github", "/bunko/oauth/authorize")
                or parts.hostname in ("checkout.stripe.com", "billing.stripe.com"))

    def open_external(self, uri):
        if not secure_url(uri):
            return False
        try:
            return Gio.AppInfo.launch_default_for_uri(uri, None)
        except GLib.Error:
            self.toast("Couldn’t open your browser.")
            return False

    def start_login(self, method):
        if self.sign_in is not None:
            self.toast("Finish or cancel the current sign-in.")
            return
        cancel = threading.Event()
        self.sign_in = cancel
        self.auth_cancel = Gio.Cancellable.new()
        self.lookup_action("cancel-login").set_enabled(True)
        self.jobs.submit(self.login_worker, method, cancel)

    def login_worker(self, method, cancel):
        try:
            verifier = secrets.token_urlsafe(32)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
            path = "native/start" if method == "github" else "lazyingart/start"
            payload = {"challenge": challenge}
            if method != "github":
                payload["mode"] = "login"
            start = get_json(self.home + "api/auth/" + path, payload)
            flow = start["flow"]
            url = start["url"]
            if cancel.is_set() or not login_url(url, self.host, method, flow):
                raise ValueError("Invalid sign-in flow")
            GLib.idle_add(self.present_login, cancel, url)
            deadline = time.monotonic() + 600
            while time.monotonic() < deadline and not cancel.wait(2):
                result = get_json(self.home + "api/auth/native/complete", {"flow": flow, "verifier": verifier})
                if result.get("pending") is True:
                    continue
                token = result.get("token", "")
                if not SESSION.fullmatch(token):
                    raise ValueError("Invalid session")
                GLib.idle_add(self.accept_login, cancel, token)
                return
        except (OSError, ValueError, TypeError, KeyError):
            pass
        GLib.idle_add(self.fail_login, cancel)

    def present_login(self, cancel, url):
        if self.sign_in is cancel and not cancel.is_set():
            if self.open_external(url):
                self.toast("Finish signing in in your browser, then return here.")
            else:
                self.cancel_login()

    def accept_login(self, cancel, token):
        if self.sign_in is not cancel or cancel.is_set():
            return
        cookie = Soup.Cookie.new("__Host-onlyideas", token, self.host, "/", 90 * 86400)
        cookie.set_secure(True)
        cookie.set_http_only(True)
        cookie.set_same_site_policy(Soup.SameSitePolicy.LAX)
        self.session.get_cookie_manager().add_cookie(cookie, self.auth_cancel, self.cookie_saved, cancel)

    def cookie_saved(self, manager, result, cancel):
        if self.sign_in is not cancel or cancel.is_set():
            return
        try:
            manager.add_cookie_finish(result)
        except GLib.Error:
            self.fail_login(cancel)
            return
        self.sign_in = None
        self.lookup_action("cancel-login").set_enabled(False)
        self.web.reload()
        self.toast("Signed in.")

    def fail_login(self, cancel):
        if self.sign_in is cancel:
            self.sign_in = None
            self.lookup_action("cancel-login").set_enabled(False)
            self.toast("Sign-in could not finish. Please try again.")

    def cancel_login(self):
        if self.sign_in is not None:
            self.sign_in.set()
            self.sign_in = None
            self.auth_cancel.cancel()
            self.lookup_action("cancel-login").set_enabled(False)
            self.toast("Sign-in canceled.")

    def start_download(self, _, download):
        download.connect("decide-destination", self.choose_destination)
        download.connect("finished", lambda d: self.finish_download(d, "File saved."))
        download.connect("failed", self.download_failed)

    def choose_destination(self, download, filename):
        source = download.get_request().get_uri()
        if not self.allows(source.removeprefix("blob:")) or len(self.downloads) >= 4:
            download.cancel()
            self.toast("Open the source in your browser to download this file.")
            return True
        name = Path(filename or "download").name.strip().lstrip(".")[:180] or "download"
        dialog = Gtk.FileDialog(title="Save File", initial_name=name)
        cancel = Gio.Cancellable.new()
        self.downloads[download] = cancel

        def saved(dialog, result):
            if download not in self.downloads:
                return
            try:
                dest = dialog.save_finish(result)
                path = dest.get_path() if dest else None
                if not path:
                    raise ValueError("Local destination required")
                # The system picker has already confirmed replacement if needed.
                download.set_allow_overwrite(True)
                download.set_destination(path)
            except (GLib.Error, ValueError):
                download.cancel()

        dialog.save(self.window, cancel, saved)
        return True

    def finish_download(self, download, message):
        if self.downloads.pop(download, None):
            self.toast(message)

    def download_failed(self, download, error):
        cancel = self.downloads.pop(download, None)
        if cancel:
            cancel.cancel()
            if not error.matches(WebKit.download_error_quark(), WebKit.DownloadError.CANCELLED_BY_USER):
                self.toast("The file could not be saved.")

    def toast(self, text):
        if self.window:
            self.toasts.add_toast(Adw.Toast(title=text, timeout=4))

    def go_home(self):
        if self.web.get_uri() != self.home:
            self.web.load_uri(self.home)
        else:
            self.web.evaluate_javascript(self.config["library_action"], -1)

    def back(self):
        script = ("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));"
                  if self.config["slug"] == "bunko"
                  else "document.querySelector('.reading-toolbar > button')?.click();")
        if self.web.can_go_back():
            self.web.go_back()
        else:
            self.web.evaluate_javascript(script, -1)

    def zoom(self, delta):
        zoom = 1 if delta is None else round(max(.7, min(2.5, self.web.get_zoom_level()+delta)), 2)
        self.web.set_zoom_level(zoom)
        self.settings["zoom"] = zoom
        self.persist()
        self.toast(f"{round(zoom * 100)}%")

    def fullscreen(self):
        if self.window.is_fullscreen():
            self.window.unfullscreen()
        else:
            self.window.fullscreen()

    def refresh(self):
        if self.content.get_visible_child_name() == "error":
            self.retry()
        else:
            self.web.reload()

    def retry(self):
        self.content.set_visible_child_name("reader")
        self.web.load_uri(self.failed_uri if getattr(self, "failed_uri", None) else self.home)

    def load_changed(self, web, event):
        if event == WebKit.LoadEvent.COMMITTED:
            self.content.set_visible_child_name("reader")

    def load_failed(self, web, event, url, error):
        if error.matches(WebKit.network_error_quark(), WebKit.NetworkError.CANCELLED):
            return True
        self.failed_uri = url if self.allows(url) else self.home
        self.error_page()
        return True

    def error_page(self):
        self.content.set_visible_child_name("error")

    def check_updates(self):
        if self.checking:
            return
        self.checking = True

        def lookup():
            try:
                feed = get_json(DOWNLOADS + "releases.json")
                if feed.get("schema") != 1:
                    raise ValueError("Invalid release list")
                release = feed["apps"][self.config["slug"]]
                installed = version_key(self.config["version"], self.config["build"])
                newer = version_key(release["version"], release["build"]) > installed
                GLib.idle_add(self.show_update, newer, release["version"])
            except (OSError, ValueError, KeyError, TypeError):
                GLib.idle_add(self.show_update, None, "")

        self.jobs.submit(lookup)

    def show_update(self, newer, version):
        self.checking = False
        if self.window and newer:
            toast = Adw.Toast(title=f"Version {version} is available", button_label="Download", timeout=12)
            toast.connect("button-clicked", lambda _: self.open_external(DOWNLOADS + "#" + self.config["slug"]))
            self.toasts.add_toast(toast)
        else:
            self.toast("You’re up to date." if newer is False else "Couldn’t check for updates.")

    def about(self):
        dialog = Adw.AboutDialog(application_name=self.config["name"], application_icon=self.config["id"],
                                 developer_name="LazyingArt", version=f'{self.config["version"]} ({self.config["build"]})',
                                 website=DOWNLOADS + "#" + self.config["slug"])
        dialog.present(self.window)

    def close_window(self, _):
        self.cancel_login()
        for download, cancel in list(self.downloads.items()):
            cancel.cancel()
            download.cancel()
        self.window = None
        return False

    def do_shutdown(self):
        self.jobs.shutdown(wait=False, cancel_futures=True)
        Adw.Application.do_shutdown(self)


def load_config():
    return json.loads(Path(__file__).with_name("app.json").read_text())


if __name__ == "__main__":
    sys.exit(DesktopApp(load_config()).run(sys.argv))
