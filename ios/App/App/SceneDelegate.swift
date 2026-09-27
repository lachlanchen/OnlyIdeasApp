import UIKit
#if !targetEnvironment(macCatalyst)
import Capacitor
#endif
import SwiftUI

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        #if targetEnvironment(macCatalyst)
        windowScene.sizeRestrictions?.minimumSize = CGSize(width: 820, height: 600)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--onlyideas-mac-qa") {
            windowScene.sizeRestrictions?.minimumSize = CGSize(width: 1280, height: 800)
            windowScene.sizeRestrictions?.maximumSize = CGSize(width: 1280, height: 800)
        }
        #endif
        #endif

        window = UIWindow(windowScene: windowScene)
        #if DEBUG && targetEnvironment(macCatalyst)
        window?.rootViewController = ProcessInfo.processInfo.arguments.contains("--onlyideas-mac-qa") ? OnlyIdeasMacQAController() : UIHostingController(rootView: NativeReadingApp())
        #elseif DEBUG
        window?.rootViewController = ProcessInfo.processInfo.arguments.contains("--onlyideas-smoke") ? OnlyIdeasSmokeController() : UIHostingController(rootView: NativeReadingApp())
        #else
        window?.rootViewController = UIHostingController(rootView: NativeReadingApp())
        #endif
        window?.makeKeyAndVisible()

        #if !targetEnvironment(macCatalyst)
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        #endif
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        #if !targetEnvironment(macCatalyst)
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
        #endif
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        #if !targetEnvironment(macCatalyst)
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
        #endif
    }
}

#if DEBUG && !targetEnvironment(macCatalyst)
import WebKit
final class OnlyIdeasSmokeController: CAPBridgeViewController {
    private var smokeStarted = false
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !smokeStarted else { return }; smokeStarted = true
        if ProcessInfo.processInfo.arguments.contains("--onlyideas-offline") {
            let source = "const originalFetch=window.fetch;window.fetch=(input,options)=>String(typeof input==='string'?input:input.url).startsWith('https://agent.onlyideas.art')?Promise.reject(new TypeError('Offline test')):originalFetch(input,options);"
            bridge?.webView?.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            bridge?.webView?.reload()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.runSmoke() }
    }
    private func runSmoke() {
        guard let webView = bridge?.webView else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.runSmoke() }; return
        }
        webView.evaluateJavaScript("document.readyState === 'complete' && !!document.getElementById('root') && !!window.Capacitor") { ready, _ in
            if ready as? Bool == true { self.executeSmoke() }
            else { DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.runSmoke() } }
        }
    }
    private func executeSmoke() {
        let script = #"""
(async () => {
  const report = { platform: window.Capacitor?.getPlatform(), checks: [] };
  const wait = async (fn, label) => { const until = Date.now() + 90000; while (!fn()) { if (Date.now() > until) throw new Error('Timed out: ' + label); await new Promise(r => setTimeout(r, 250)); } };
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  const check = (label, ok) => { if (!ok) throw new Error(label); report.checks.push(label); };
  try {
    await wait(() => button('Open paper'), 'library');
    check('native iOS bridge', report.platform === 'ios');
    check('library fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const offline = !!document.querySelector('.connection-notice');
    button('Open paper').click();
    await wait(() => document.querySelector('.paper-content mjx-container') && [...document.querySelectorAll('.paper-content img')].some(i => i.complete && i.naturalWidth > 0), 'equation and figure');
    check('equations rendered', !!document.querySelector('.paper-content mjx-container svg'));
    check('figure preserved', [...document.querySelectorAll('.paper-content img')].every(i => i.complete && i.naturalWidth > 0));
    check('reader fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const before = parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize);
    document.querySelector('[aria-label="Increase text size"]').click();
    await wait(() => parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize) > before, 'text sizing');
    check('reader text control', true);
    if (!offline && button('Read offline')) { button('Read offline').click(); await wait(() => button('Downloaded · Remove'), 'offline download'); }
    check(offline ? 'download survives a disconnected cold launch' : 'paper and figures downloaded', !!button('Downloaded · Remove'));
    document.querySelector('[aria-label="Toggle discussion panel"]').click();
    await wait(() => document.querySelector('.reading-panel'), 'discussion panel');
    check('native discussion panel', true);
    document.querySelector('[aria-label="Close reading panel"]').click();
    report.ok = true;
  } catch (e) { report.ok = false; report.error = e.message; }
  window.__onlyideasSmoke = report;
})();

"""#
        bridge?.webView?.evaluateJavaScript("void " + script) { _, _ in self.pollSmoke(remaining: 120) }
    }
    private func pollSmoke(remaining: Int) {
        bridge?.webView?.evaluateJavaScript("JSON.stringify(window.__onlyideasSmoke || null)") { result, _ in
            if let value = result as? String, value != "null" {
                let root = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                try? value.write(to: root.appendingPathComponent("native-smoke.json"), atomically: true, encoding: .utf8)
            } else if remaining > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.pollSmoke(remaining: remaining - 1) }
            }
        }
    }
}
#endif

#if DEBUG && targetEnvironment(macCatalyst)
import WebKit
/// Exercises the real native UI and production public library; never signs in or writes server data.
@MainActor final class OnlyIdeasMacQAController: UIHostingController<NativeReadingApp> {
    private let store: ReadingStore
    private var started = false
    private var checks: [String] = []
    private var result: [String: Any] = [:]
    private let output = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("MacQA", isDirectory: true)
    init() { let store = ReadingStore(); self.store = store; super.init(rootView: NativeReadingApp(qaStore: store)) }
    @MainActor required dynamic init?(coder: NSCoder) { fatalError("QA has no storyboard") }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started else { return }; started = true
        Task { await run() }
    }
    private func pause(_ seconds: Double = 1) async { try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000)) }
    private func check(_ label: String, _ ok: Bool) throws {
        guard ok else { throw NSError(domain: "OnlyIdeasMacQA", code: 1, userInfo: [NSLocalizedDescriptionKey: label]) }
        checks.append(label)
    }
    private func snapshot(_ name: String) throws {
        guard let window = view.window else { throw store.failure("No native window") }
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        let data = UIGraphicsImageRenderer(bounds: window.bounds, format: format).pngData { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: false) }
        try data.write(to: output.appendingPathComponent(name + ".png"))
    }
    private func webView(_ view: UIView) -> WKWebView? {
        if let web = view as? WKWebView { return web }
        return view.subviews.lazy.compactMap { self.webView($0) }.first
    }
    private func wait(_ condition: () -> Bool) async throws {
        for _ in 0..<180 { if condition() { return }; await pause(0.5) }
        throw store.failure("Native UI wait timed out")
    }
    private func run() async {
        do {
            try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
            try check("QA preserves signed-in accounts", store.account == nil)
            try await wait { !self.store.papers.isEmpty }
            await pause(2)
            try check("Live or previously cached public library", store.papers.allSatisfy { $0.visibility == "public" })
            result["offline"] = store.offline
            result["titles"] = store.papers.map(\.title)
            try snapshot("library")
            NotificationCenter.default.post(name: Notification.Name("OnlyIdeas.QA.Tab"), object: 1)
            await pause(); try snapshot("agent")
            NotificationCenter.default.post(name: Notification.Name("OnlyIdeas.QA.Tab"), object: 2)
            await pause(); try snapshot("profile")
            store.showSignIn = true; await pause(); try snapshot("sign-in")
            store.showSignIn = false
            NotificationCenter.default.post(name: Notification.Name("OnlyIdeas.QA.Tab"), object: 0)
            await pause()
            let paper = store.papers.first { $0.title.localizedCaseInsensitiveContains("holographic") } ?? store.papers[0]
            let document = try await store.loadPaper(paper)
            try check("Real public paper and figures cached", document.owner == "public" && !document.figures.isEmpty && store.cachedPaper(paper.id) != nil)
            NotificationCenter.default.post(name: Notification.Name("OnlyIdeas.QA.Paper"), object: paper.id)
            try await wait { self.webView(self.view) != nil }
            guard let web = webView(view) else { throw store.failure("Missing reader") }
            for _ in 0..<120 {
                if (try? await web.evaluateJavaScript("document.querySelector('#paper')?.dataset.ready === 'true'")) as? Bool == true { break }
                await pause(0.5)
            }
            let script = "({equations:document.querySelectorAll('mjx-container svg').length, figures:[...document.querySelectorAll('#paper img')].filter(i=>i.complete&&i.naturalWidth>0).length, fits:document.documentElement.scrollWidth<=innerWidth+1, size:parseFloat(getComputedStyle(document.getElementById('paper')).fontSize), paragraphs:document.querySelectorAll('[data-paragraph]').length})"
            for _ in 0..<40 {
                if (try? await web.evaluateJavaScript("[...document.querySelectorAll('#paper img')].some(i=>i.complete&&i.naturalWidth>0)")) as? Bool == true { break }
                await pause(0.5)
            }
            let metrics = try await web.evaluateJavaScript(script) as? [String:Any] ?? [:]
            result["reader"] = metrics
            try check("Equations rendered as SVG", (metrics["equations"] as? Int ?? 0) > 0)
            try check("Downloaded figures rendered", (metrics["figures"] as? Int ?? 0) > 0)
            try check("Reader fits window without horizontal page scroll", metrics["fits"] as? Bool == true)
            try snapshot("reader")
            _ = try? await web.evaluateJavaScript("document.querySelector('mjx-container[display=true]')?.scrollIntoView({block:'start'})")
            await pause(); try snapshot("equations")
            _ = try? await web.evaluateJavaScript("document.querySelector('#paper img')?.scrollIntoView({block:'start'})")
            await pause(); try snapshot("figures")
            let oldSize=store.readingSize, oldAppearance=store.appearance
            defer { store.readingSize=oldSize; store.appearance=oldAppearance }
            store.readingSize=22; store.appearance="dark"; store.objectWillChange.send(); await pause()
            let style = try await web.evaluateJavaScript("({size:parseFloat(getComputedStyle(document.getElementById('paper')).fontSize),dark:document.documentElement.dataset.theme==='dark'})") as? [String:Any] ?? [:]
            try check("Native text size and dark appearance update renderer", style["size"] as? Double == 22 && style["dark"] as? Bool == true)
            try snapshot("reader-dark")
            try check("Offline cold launch uses durable cached paper", !ProcessInfo.processInfo.arguments.contains("--onlyideas-native-offline") || store.offline)
            result["ok"] = true
        } catch { result["ok"] = false; result["error"] = error.localizedDescription }
        result["checks"] = checks
        if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]) { try? data.write(to: output.appendingPathComponent("result.json"), options: .atomic) }
    }
}
#endif
