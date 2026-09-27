package art.onlyideas.app;

import static androidx.appcompat.app.AppCompatDelegate.*;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.*;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import org.json.*;

public class MainActivity extends AppCompatActivity {
  private final ExecutorService io = Executors.newFixedThreadPool(3);
  private final Handler handler = new Handler(Looper.getMainLooper());
  private NativeSession api;
  private LinearLayout root, header, content, bottom, messages;
  private ScrollView chatScroll;
  private EditText composer;
  private TextView progress;
  private Button sendButton;
  private JSONObject account, document;
  private boolean derived = false;
  private JSONArray papers = new JSONArray(),
      chats = new JSONArray(),
      chatMessages = new JSONArray(),
      jobs = new JSONArray();
  private String page = "library", chatId = "", agentStatus = "", quote = "", lastMessages = "";
  private boolean busy = false, refreshingChat = false, offline = false, shareUpload = true;
  private volatile int authEpoch = 0;
  private int ink, muted, bg, surface, soft, green, readerRequest = 0;
  private final Object cacheLock = new Object();
  private Future<?> cacheWarmup;
  private WebView reader;
  private final OnBackPressedCallback navigateBack =
      new OnBackPressedCallback(false) {
        @Override
        public void handleOnBackPressed() {
          showLibrary();
        }
      };
  private final Runnable poll =
      new Runnable() {
        public void run() {
          if (page.equals("agent") && !chatId.isEmpty()) loadChat(false);
          if (account != null) loadJobs(false);
          handler.postDelayed(this, 3500);
        }
      };

  @Override
  public void onCreate(Bundle saved) {
    androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
    super.onCreate(saved);
    getOnBackPressedDispatcher().addCallback(this, navigateBack);
    setTheme(art.onlyideas.app.R.style.AppTheme_NoActionBar);
    androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(
        getPreferences(MODE_PRIVATE).getInt("appearance", -1));
    api = new NativeSession(this);
    if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);
    String user = getPreferences(MODE_PRIVATE).getString("account", null);
    if (api.token() != null && user != null)
      try {
        account = new JSONObject(user);
      } catch (Exception ignored) {
      }
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    clearExports();
    restoreLibrary();
    buildRoot();
    showLibrary();
    refresh();
  }

  @Override
  public void onConfigurationChanged(Configuration next) {
    super.onConfigurationChanged(next);
    if (root == null) return;
    String current = page;
    buildRoot();
    if (current.equals("profile")) showProfile();
    else if (current.equals("agent")) showAgent();
    else if (current.equals("reader") && document != null) showReader();
    else showLibrary();
  }

  @Override
  protected void onResume() {
    super.onResume();
    handler.removeCallbacks(poll);
    handler.postDelayed(poll, 2000);
    if (api != null && api.get("onlyideas.native.flow") != null) completeLogin();
  }

  @Override
  protected void onPause() {
    handler.removeCallbacks(poll);
    super.onPause();
  }

  @Override
  protected void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    if (reader != null) reader.destroy();
    io.shutdownNow();
    super.onDestroy();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (intent.getData() != null
        && intent.getData().toString().startsWith("art.onlyideas.app://oauth/complete"))
      completeLogin();
  }

  int dp(float n) {
    return (int) (n * getResources().getDisplayMetrics().density + .5f);
  }

  void colors() {
    boolean dark =
        (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
    ink = Color.parseColor(dark ? "#edf3ee" : "#192f27");
    muted = Color.parseColor(dark ? "#acbdb2" : "#617268");
    bg = Color.parseColor(dark ? "#131c17" : "#f4f7f3");
    surface = Color.parseColor(dark ? "#202c24" : "#ffffff");
    soft = Color.parseColor(dark ? "#293d30" : "#e7efe7");
    green = Color.parseColor(dark ? "#8fc8a6" : "#28654d");
  }

  GradientDrawable rounded(int color, int radius) {
    GradientDrawable d = new GradientDrawable();
    d.setColor(color);
    d.setCornerRadius(dp(radius));
    return d;
  }

  LinearLayout column() {
    LinearLayout l = new LinearLayout(this);
    l.setOrientation(LinearLayout.VERTICAL);
    return l;
  }

  LinearLayout row() {
    LinearLayout l = new LinearLayout(this);
    l.setOrientation(LinearLayout.HORIZONTAL);
    l.setGravity(Gravity.CENTER_VERTICAL);
    return l;
  }

  TextView text(String value, int size, boolean bold) {
    TextView v = new TextView(this);
    v.setText(value);
    v.setTextSize(TypedValue.COMPLEX_UNIT_SP, size);
    v.setTextColor(ink);
    v.setLineSpacing(dp(3), 1.05f);
    if (bold) v.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
    return v;
  }

  Button button(String label, boolean primary, Runnable action) {
    Button b = new Button(this);
    b.setText(label);
    b.setTextSize(16);
    b.setAllCaps(false);
    b.setElevation(0);
    b.setStateListAnimator(null);
    b.setTextColor(primary ? Color.WHITE : green);
    b.setMinHeight(dp(44));
    b.setMinimumHeight(dp(44));
    b.setPadding(dp(12), dp(7), dp(12), dp(7));
    b.setBackground(rounded(primary ? Color.parseColor("#28654d") : soft, 15));
    b.setOnClickListener(v -> action.run());
    return b;
  }

  void gap(LinearLayout c, int size) {
    View v = new View(this);
    c.addView(v, new LinearLayout.LayoutParams(1, dp(size)));
  }

  void caption(LinearLayout c, String value) {
    TextView t = text(value, 14, false);
    t.setTextColor(muted);
    c.addView(t);
  }

  void title(LinearLayout c, String value, int size) {
    c.addView(text(value, size, true));
  }

  LinearLayout card() {
    LinearLayout c = column();
    c.setPadding(dp(14), dp(14), dp(14), dp(14));
    c.setBackground(rounded(surface, 14));
    return c;
  }

  void addCard(LinearLayout parent, LinearLayout card) {
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
    p.bottomMargin = dp(10);
    parent.addView(card, p);
  }

  LinearLayout scrollContent() {
    ScrollView s = new ScrollView(this);
    s.setFillViewport(true);
    LinearLayout c = column();
    c.setPadding(dp(14), dp(12), dp(14), dp(20));
    s.addView(c);
    content.addView(s, new LinearLayout.LayoutParams(-1, -1));
    return c;
  }

  void buildRoot() {
    colors();
    root = column();
    root.setBackgroundColor(bg);
    header = row();
    header.setPadding(dp(14), dp(4), dp(10), dp(4));
    root.addView(header);
    content = column();
    root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
    bottom = row();
    bottom.setBackgroundColor(surface);
    bottom.setPadding(dp(8), dp(2), dp(8), dp(2));
    root.addView(bottom);
    setContentView(root);
    ViewCompat.setOnApplyWindowInsetsListener(
        root,
        (v, insets) -> {
          var bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
          var ime = insets.getInsets(WindowInsetsCompat.Type.ime());
          v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
          bottom.setVisibility(ime.bottom > bars.bottom ? View.GONE : View.VISIBLE);
          return insets;
        });
  }

  void navigation(String name) {
    header.removeAllViews();
    TextView t = text(name, 22, true);
    header.addView(t, new LinearLayout.LayoutParams(0, -2, 1));
    Button profile = button(account == null ? "Profile" : initial(), false, () -> showProfile());
    profile.setContentDescription("Open profile");
    header.addView(profile, new LinearLayout.LayoutParams(-2, dp(48)));
    bottom.removeAllViews();
    String[] tabs = {"Library", "Agent", "Profile"};
    for (String tab : tabs) {
      Button b =
          button(
              tab,
              false,
              () -> {
                if (tab.equals("Library")) showLibrary();
                else if (tab.equals("Agent")) showAgent();
                else showProfile();
              });
      b.setTextSize(16);
      b.setBackground(rounded(page.equals(tab.toLowerCase()) ? soft : surface, 14));
      LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(44), 1);
      lp.setMargins(dp(3), 0, dp(3), 0);
      bottom.addView(b, lp);
    }
  }

  String initial() {
    String name = account == null ? "" : account.optString("name", "").trim();
    return name.isEmpty()
        ? "Reader"
        : name.substring(0, name.offsetByCodePoints(0, 1)).toUpperCase();
  }

  void clear(String next) {
    if (reader != null) {
      reader.stopLoading();
      reader.removeJavascriptInterface("NativeReader");
      reader.destroy();
      reader = null;
    }
    quote = "";
    page = next;
    navigateBack.setEnabled(!next.equals("library"));
    content.removeAllViews();
    navigation(
        next.equals("library")
            ? "OnlyIdeas"
            : next.equals("agent") ? "Agent" : next.equals("reader") ? "Reading" : "Profile");
  }

  <T> void job(Callable<T> work, Consumer<T> done) {
    int epoch = authEpoch;
    io.execute(
        () -> {
          try {
            T result = work.call();
            handler.post(
                () -> {
                  if (!isFinishing() && epoch == authEpoch) done.accept(result);
                });
          } catch (Exception e) {
            handler.post(
                () -> {
                  if (!isFinishing() && epoch == authEpoch) {
                    busy = false;
                    alert(e.getMessage() == null ? "Please try again." : e.getMessage());
                    if (sendButton != null) sendButton.setEnabled(true);
                  }
                });
          }
        });
  }

  void alert(String message) {
    new AlertDialog.Builder(this)
        .setTitle("OnlyIdeas")
        .setMessage(message)
        .setPositiveButton("OK", null)
        .show();
  }

  void toast(String message) {
    Toast.makeText(this, message, Toast.LENGTH_LONG).show();
  }

  JSONObject object(String key, Object value) {
    JSONObject j = new JSONObject();
    try {
      j.put(key, value);
    } catch (Exception ignored) {
    }
    return j;
  }

  void refresh() {
    String previous = api.token();
    job(
        () -> {
          JSONObject result = new JSONObject();
          try {
            result.put("session", api.json("/api/session", "GET", null));
            result.put("papers", api.json("/api/papers", "GET", null).getJSONArray("papers"));
          } catch (Exception e) {
            result.put("offline", true);
            JSONArray local = new JSONArray();
            for (JSONObject d : downloads()) local.put(d.getJSONObject("paper"));
            result.put("papers", local);
            if (local.length() == 0) result.put("error", e.getMessage());
          }
          return result;
        },
        r -> {
          if (!Objects.equals(previous, api.token())) return;
          offline = r.optBoolean("offline");
          JSONObject session = r.optJSONObject("session");
          if (session != null) {
            JSONObject next = session.optJSONObject("user");
            if (!Objects.equals(account == null ? null : account.optString("id"), next == null ? null : next.optString("id"))) authEpoch++;
            account = next;
            if (account == null && api.token() != null) {
              try {
                api.token(null);
              } catch (Exception ignored) {
              }
              clearPrivateDownloads();
            }
            getPreferences(MODE_PRIVATE)
                .edit()
                .putString("account", account == null ? null : account.toString())
                .apply();
          }
          papers = r.optJSONArray("papers");
          if (papers == null) papers = new JSONArray();
          if (account == null) { JSONArray visible = new JSONArray(); for(int i=0;i<papers.length();i++) { JSONObject p=papers.optJSONObject(i); if(p!=null && p.optString("visibility").equals("public")) visible.put(p); } papers=visible; }
          if (!offline) {
            getPreferences(MODE_PRIVATE).edit().putString("library", papers.toString())
                .putString("libraryOwner", account == null ? "public" : account.optString("id")).apply();
            warmLibrary(papers);
          }
          if (page.equals("library")) showLibrary();
          else if (page.equals("profile")) showProfile();
          else if (page.equals("agent")) navigation("Agent");
          if (r.has("error")) toast("Connection unavailable. Saved papers remain on this device.");
        });
  }

  void showLibrary() {
    clear("library");
    LinearLayout c = scrollContent();
    title(c, "Your reading room", 20);
    gap(c, 10);
    caption(c, "Read, ask, and make connections.");
    gap(c, 12);
    c.addView(
        button(
            "＋  Add a paper",
            true,
            () -> {
              if (account == null) {
                signIn();
                return;
              }
              Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
              pick.setType("application/pdf");
              pick.addCategory(Intent.CATEGORY_OPENABLE);
              startActivityForResult(pick, 42);
            }));
    android.widget.Switch sharing = new android.widget.Switch(this);
    sharing.setText("Share new papers"); sharing.setChecked(shareUpload);
    sharing.setOnCheckedChangeListener((v, checked) -> shareUpload = checked); c.addView(sharing);
    caption(c, "Shared after source and community review. Turn off for Only me.");
    gap(c, 14);
    if (offline) {
      caption(c, "Offline · cached papers");
      gap(c, 14);
    }
    LinearLayout searchBox = row();
    EditText search = new EditText(this);
    search.setSingleLine(true);
    search.setTextSize(16);
    search.setTextColor(ink);
    search.setHintTextColor(muted);
    search.setHint("Search your papers");
    search.setPadding(dp(12), dp(8), dp(12), dp(8));
    search.setBackground(rounded(surface, 14));
    searchBox.addView(search, new LinearLayout.LayoutParams(0, dp(44), 1));
    c.addView(searchBox);
    gap(c, 12);
    title(c, "Reading library", 18);
    gap(c, 10);
    LinearLayout list = column();
    c.addView(list);
    renderLibrary(list, "");
    search.addTextChangedListener(
        new android.text.TextWatcher() {
          public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

          public void onTextChanged(CharSequence s, int start, int before, int count) {
            renderLibrary(list, s.toString());
          }

          public void afterTextChanged(android.text.Editable e) {}
        });
    gap(c, 10);
    if (account != null) c.addView(button("Conversion requests", false, () -> loadJobs(true)));
    gap(c, 12);
    c.addView(button("Refresh library", false, this::refresh));
  }

  void renderLibrary(LinearLayout list, String query) {
    list.removeAllViews();
    for (int i = 0; i < papers.length(); i++) {
      JSONObject p = papers.optJSONObject(i);
      if (p == null
          || !(p.optString("title") + p.optString("authors"))
              .toLowerCase()
              .contains(query.toLowerCase())) continue;
      LinearLayout card = card();
      caption(
          card,
          p.optString("language", "paper").toUpperCase()
              + "  ·  "
              + (p.optString("visibility").equals("private") ? "Private paper" : "Reading room"));
      gap(card, 6);
      title(card, p.optString("title"), 18);
      gap(card, 6);
      TextView authors = text(p.optString("authors", "Personal paper"), 14, false);
      authors.setTextColor(muted); authors.setMaxLines(2); authors.setEllipsize(android.text.TextUtils.TruncateAt.END);
      card.addView(authors);
      card.setContentDescription("Open paper: " + p.optString("title"));
      card.setFocusable(true); card.setOnClickListener(v -> openPaper(p));
      addCard(list, card);
    }
    if (list.getChildCount() == 0)
      caption(list, "Add a PDF or ask the agent to find your next paper.");
  }

  void showProfile() {
    clear("profile");
    LinearLayout c = scrollContent();
    TextView avatar = text(account == null ? "◉" : initial(), 36, true);
    avatar.setGravity(Gravity.CENTER);
    avatar.setTextColor(Color.WHITE);
    avatar.setBackground(rounded(Color.parseColor("#28654d"), 42));
    c.addView(avatar, new LinearLayout.LayoutParams(dp(80), dp(80)));
    gap(c, 20);
    title(c, account == null ? "Your reading space" : account.optString("name"), 29);
    gap(c, 8);
    caption(
        c,
        account == null
            ? "Keep your papers and conversations together."
            : "@" + account.optString("login"));
    gap(c, 14);
    if (account == null) {
      c.addView(button("Continue with GitHub", true, this::signIn));
      gap(c, 12);
    }
    LinearLayout reading = card();
    title(reading, "Reading preferences", 22);
    gap(reading, 18);
    TextView sample = text("A little more room for your next idea.", fontSize(), false);
    TextView size = text("Reading text · " + fontSize() + " sp", 18, false);
    reading.addView(size);
    SeekBar slider = new SeekBar(this);
    slider.setMax(19);
    slider.setProgress(fontSize() - 15);
    slider.setContentDescription("Reading text size");
    reading.addView(slider, new LinearLayout.LayoutParams(-1, dp(56)));
    reading.addView(sample);
    slider.setOnSeekBarChangeListener(
        new SeekBar.OnSeekBarChangeListener() {
          public void onProgressChanged(SeekBar s, int p, boolean user) {
            int n = p + 15;
            getPreferences(MODE_PRIVATE).edit().putInt("font", n).apply();
            size.setText("Reading text · " + n + " sp");
            sample.setTextSize(n);
          }

          public void onStartTrackingTouch(SeekBar s) {}

          public void onStopTrackingTouch(SeekBar s) {}
        });
    gap(reading, 14);
    reading.addView(
        button(
            "Appearance",
            false,
            () ->
                new AlertDialog.Builder(this)
                    .setTitle("Appearance")
                    .setItems(
                        new String[] {"System", "Light", "Dark"},
                        (d, n) -> {
                          int mode =
                              n == 0
                                  ? MODE_NIGHT_FOLLOW_SYSTEM
                                  : n == 1 ? MODE_NIGHT_NO : MODE_NIGHT_YES;
                          getPreferences(MODE_PRIVATE).edit().putInt("appearance", mode).apply();
                          androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(mode);
                        })
                    .setNegativeButton("Cancel", null)
                    .show()));
    addCard(c, reading);
    LinearLayout library = card();
    title(library, "Your library", 22);
    gap(library, 12);
    caption(library, downloads().size() + " papers cached on this device");
    gap(library, 16);
    library.addView(button("Your agent conversations", false, this::showAgent));
    addCard(c, library);
    LinearLayout about = card();
    title(about, "OnlyIdeas 1.0", 22);
    gap(about, 12);
    caption(
        about,
        "Read papers with their equations and figures. Search with the connected paper agent. Your"
            + " conversations and personal papers stay in your account.");
    for (String policy : new String[]{"Support", "Privacy", "Terms"}) {
      about.addView(button(policy.equals("Terms") ? "Community Terms" : policy, false,
          () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/" + policy.toLowerCase(java.util.Locale.ROOT) + ".html")))));
    }
    addCard(c, about);
    if (account != null) {
      c.addView(button("Report content", false, () -> reportContent("")));
      c.addView(button("Blocked readers", false, this::blockedReaders));
      c.addView(button("Delete account", false, () -> new AlertDialog.Builder(this)
        .setTitle("Permanently delete your account?")
        .setMessage("Your account, cloud papers, notes, comments, chats and private downloads will be deleted and all sessions signed out. Previously published GitHub copies and others’ copies may remain under their public license. This cannot be undone.")
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Delete account", (d,w) -> job(() -> api.json("/api/account", "DELETE", object("confirm", "DELETE")), r -> signOut()))
        .show()));
      gap(c, 12);
      Button signout =
          button(
              "Sign out",
              false,
              () ->
                  new AlertDialog.Builder(this)
                      .setTitle("Sign out on this device?")
                      .setMessage(
                          "Private offline downloads will be removed. Your cloud library and"
                              + " conversations will remain.")
                      .setNegativeButton("Cancel", null)
                      .setPositiveButton("Sign out", (d, w) -> signOut())
                      .show());
      signout.setTextColor(Color.parseColor("#ab3f36"));
      c.addView(signout);
    }
  }

  int fontSize() {
    return Math.max(15, getPreferences(MODE_PRIVATE).getInt("font", 18));
  }

  void showAgent() {
    clear("agent");
    LinearLayout actions = row();
    actions.setPadding(dp(18), dp(6), dp(18), dp(10));
    Button history = button("History", false, this::showHistory);
    actions.addView(history, new LinearLayout.LayoutParams(0, dp(48), 1));
    View space = new View(this);
    actions.addView(space, new LinearLayout.LayoutParams(dp(10), 1));
    actions.addView(
        button(
            "New chat",
            false,
            () -> {
              chatId = "";
              chatMessages = new JSONArray();
              agentStatus = "";
              showAgent();
            }),
        new LinearLayout.LayoutParams(0, dp(48), 1));
    content.addView(actions);
    chatScroll = new ScrollView(this);
    chatScroll.setFillViewport(true);
    messages = column();
    messages.setPadding(dp(22), dp(18), dp(22), dp(20));
    chatScroll.addView(messages);
    content.addView(chatScroll, new LinearLayout.LayoutParams(-1, 0, 1));
    progress = text(agentStatus, 16, false);
    progress.setTextColor(green);
    progress.setPadding(dp(22), dp(8), dp(22), dp(8));
    content.addView(progress);
    LinearLayout compose = row();
    compose.setGravity(Gravity.BOTTOM);
    compose.setPadding(dp(12), dp(10), dp(12), dp(10));
    compose.setBackground(rounded(surface, 14));
    LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, -2);
    cp.setMargins(dp(16), dp(4), dp(16), dp(14));
    content.addView(compose, cp);
    composer = new EditText(this);
    composer.setTextSize(19);
    composer.setTextColor(ink);
    composer.setHintTextColor(muted);
    composer.setHint("Ask or paste a paper link…");
    composer.setContentDescription("Message the paper agent");
    composer.setMinLines(2);
    composer.setMaxLines(5);
    composer.setInputType(
        InputType.TYPE_CLASS_TEXT
            | InputType.TYPE_TEXT_FLAG_MULTI_LINE
            | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
    composer.setBackgroundColor(Color.TRANSPARENT);
    compose.addView(composer, new LinearLayout.LayoutParams(0, -2, 1));
    sendButton = button("↑", true, () -> send(composer.getText().toString()));
    sendButton.setTextSize(26);
    sendButton.setContentDescription("Send message");
    compose.addView(sendButton, new LinearLayout.LayoutParams(dp(52), dp(52)));
    renderMessages();
    if (!chatId.isEmpty()) loadChat(false);
  }

  void renderMessages() {
    if (!page.equals("agent") || messages == null) return;
    messages.removeAllViews();
    if (chatMessages.length() == 0) {
      title(messages, "What are you\ncurious about?", 31);
      gap(messages, 16);
      caption(
          messages,
          "Find open papers, follow a question, and bring the useful ones into your library.");
      gap(messages, 24);
      for (String topic :
          new String[] {
            "Find papers about quantum entanglement", "Find research on language learning"
          }) {
        Button suggestion = button(topic, false, () -> send(topic));
        suggestion.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        messages.addView(suggestion);
        gap(messages, 12);
      }
    }
    for (int i = 0; i < chatMessages.length(); i++) {
      JSONObject m = chatMessages.optJSONObject(i);
      if (m == null) continue;
      LinearLayout bubble = column();
      boolean user = m.optString("role").equals("user");
      bubble.setPadding(user ? dp(18) : 0, dp(12), user ? dp(18) : 0, dp(16));
      if (user) bubble.setBackground(rounded(soft, 20));
      caption(bubble, user ? "You" : "OnlyIdeas");
      gap(bubble, 8);
      TextView body = text(m.optString("text"), 19, false);
      body.setTextIsSelectable(true);
      bubble.addView(body);
      if (!user) bubble.addView(button("Report response", false, () -> reportContent("Agent message " + m.optString("id") + " in conversation " + chatId)));
      JSONArray found = m.optJSONArray("papers");
      if (found != null)
        for (int j = 0; j < found.length(); j++) {
          JSONObject p = found.optJSONObject(j);
          if (p == null) continue;
          gap(bubble, 18);
          LinearLayout card = card();
          caption(card, p.optString("year") + " · Open paper");
          gap(card, 6);
          title(card, p.optString("title"), 22);
          gap(card, 6);
          caption(card, p.optString("authors"));
          gap(card, 6);
          card.addView(
              button(
                  "Read abstract",
                  false,
                  () ->
                      new AlertDialog.Builder(this)
                          .setTitle(p.optString("title"))
                          .setMessage(p.optString("summary"))
                          .setPositiveButton("Done", null)
                          .show()));
          gap(card, 6);
          android.widget.Switch sharing = new android.widget.Switch(this);
          sharing.setText("Share with the reading room"); sharing.setChecked(true); card.addView(sharing);
          caption(card, "Shared after source and community review. Turn off for Only me.");
          card.addView(
              button(
                  "Convert & add",
                  true,
                  () ->
                      job(
                          () ->
                              api.json(
                                  "/api/chats/" + chatId + "/import",
                                  "POST",
                                  object("paperId", p.optString("id")).put("sharing", sharing.isChecked() ? "shared" : "private")),
                          r -> {
                            toast("Paper queued for conversion.");
                            loadChat(true);
                            loadJobs(true);
                          })));
          bubble.addView(card);
        }
      if (m.has("jobId")) {
        gap(bubble, 12);
        bubble.addView(button("View conversion", false, () -> loadJobs(true)));
      }
      messages.addView(bubble);
      gap(messages, 14);
    }
    progress.setText(agentStatus);
    progress.setVisibility(agentStatus.isEmpty() ? View.GONE : View.VISIBLE);
    sendButton.setEnabled(agentStatus.isEmpty() && !busy);
  }

  void send(String text) {
    if (account == null) {
      signIn();
      return;
    }
    if (text.trim().isEmpty() || busy || !agentStatus.isEmpty()) return;
    busy = true;
    sendButton.setEnabled(false);
    String old = chatId;
    job(
        () -> {
          String id = old;
          if (id.isEmpty())
            id =
                api.json("/api/chats", "POST", new JSONObject())
                    .getJSONObject("chat")
                    .getString("id");
          api.json("/api/chats/" + id + "/messages", "POST", object("text", text));
          return id;
        },
        id -> {
          busy = false;
          chatId = id;
          composer.setText("");
          agentStatus = "Waiting for the paper agent";
          loadChat(true);
        });
  }

  void loadChat(boolean scroll) {
    if (chatId.isEmpty() || refreshingChat) return;
    String id = chatId;
    refreshingChat = true;
    io.execute(
        () -> {
          try {
            JSONObject r = api.json("/api/chats/" + id, "GET", null);
            handler.post(
                () -> {
                  refreshingChat = false;
                  if (!chatId.equals(id) || !page.equals("agent")) return;
                  JSONArray pending = r.optJSONArray("pending");
                  boolean online =
                      r.optJSONObject("agent") != null
                          && r.optJSONObject("agent").optBoolean("online");
                  agentStatus =
                      pending != null && pending.length() > 0
                          ? (online
                              ? pending.optJSONObject(0).optString("status")
                              : "Your request is saved. Waiting for the paper agent…")
                          : "";
                  chatMessages = r.optJSONArray("messages");
                  if (chatMessages == null) chatMessages = new JSONArray();
                  String encoded = chatMessages.toString();
                  boolean changed = !encoded.equals(lastMessages);
                  if (changed) {
                    lastMessages = encoded;
                    renderMessages();
                    if (scroll || changed)
                      chatScroll.post(() -> chatScroll.fullScroll(View.FOCUS_DOWN));
                  } else {
                    progress.setText(agentStatus);
                    progress.setVisibility(agentStatus.isEmpty() ? View.GONE : View.VISIBLE);
                    sendButton.setEnabled(agentStatus.isEmpty() && !busy);
                  }
                });
          } catch (Exception e) {
            handler.post(
                () -> {
                  refreshingChat = false;
                  if (page.equals("agent"))
                    progress.setText("Connection interrupted. Your conversation is saved.");
                });
          }
        });
  }

  void showHistory() {
    if (account == null) {
      signIn();
      return;
    }
    job(
        () -> api.json("/api/chats", "GET", null),
        r -> {
          chats = r.optJSONArray("chats");
          if (chats == null || chats.length() == 0) {
            toast("Your conversations will appear here.");
            return;
          }
          String[] titles = new String[chats.length()];
          for (int i = 0; i < titles.length; i++)
            titles[i] = chats.optJSONObject(i).optString("title");
          new AlertDialog.Builder(this)
              .setTitle("Conversations")
              .setItems(
                  titles,
                  (d, n) -> {
                    chatId = chats.optJSONObject(n).optString("id");
                    lastMessages = "";
                    chatMessages = new JSONArray();
                    agentStatus = "";
                    showAgent();
                  })
              .setNegativeButton("Done", null)
              .show();
        });
  }

  void reportContent(String context) {
    if (account == null) { signIn(); return; }
    EditText reason = new EditText(this); reason.setHint("Which paper or AI response concerns you, and why?"); reason.setTextSize(18); reason.setMinLines(4);
    AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Report content").setView(reason)
      .setNegativeButton("Cancel", null).setPositiveButton("Send report", null).create();
    dialog.setOnShowListener(v -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w -> {
      if (reason.getText().toString().trim().length() < 3) { reason.setError("Please describe the issue."); return; }
      job(() -> api.json("/api/reports", "POST", new JSONObject().put("context",context).put("reason",reason.getText().toString())), r -> { dialog.dismiss(); toast("Report sent for review."); });
    }));
    dialog.show();
  }

  void blockedReaders() {
    job(() -> api.json("/api/blocks", "GET", null), result -> {
      JSONArray blocks = result.optJSONArray("blocks");
      if (blocks == null || blocks.length() == 0) { alert("You have no blocked readers."); return; }
      String[] names = new String[blocks.length()];
      for (int i=0; i<names.length; i++) names[i] = "Unblock " + blocks.optJSONObject(i).optString("name");
      new AlertDialog.Builder(this).setTitle("Blocked readers").setItems(names, (d,n) ->
        job(() -> api.json("/api/blocks/" + blocks.optJSONObject(n).optString("id"), "DELETE", null), r -> blockedReaders()))
        .setNegativeButton("Done", null).show();
    });
  }

  void signIn() {
    if (busy) return;
    busy = true;
    job(
        () -> {
          String verifier = NativeSession.random();
          String challenge =
              Base64.encodeToString(
                  MessageDigest.getInstance("SHA-256")
                      .digest(verifier.getBytes(StandardCharsets.UTF_8)),
                  Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
          JSONObject flow =
              api.json("/api/auth/native/start", "POST", object("challenge", challenge));
          flow.put("verifier", verifier);
          flow.put("expires", System.currentTimeMillis() + 600000);
          api.set("onlyideas.native.flow", flow.toString());
          return flow;
        },
        flow -> {
          busy = false;
          Uri url = Uri.parse(flow.optString("url"));
          if (!"https".equals(url.getScheme()) || !"agent.onlyideas.art".equals(url.getHost())) {
            alert("Invalid sign-in address.");
            return;
          }
          startActivity(new Intent(Intent.ACTION_VIEW, url));
        });
  }

  void completeLogin() {
    String saved = api.get("onlyideas.native.flow");
    if (saved == null || busy) return;
    busy = true;
    job(
        () -> {
          JSONObject flow = new JSONObject(saved);
          if (flow.optLong("expires") < System.currentTimeMillis()) {
            api.set("onlyideas.native.flow", null);
            throw new Exception("Sign-in expired. Please try again.");
          }
          JSONObject result =
              api.json(
                  "/api/auth/native/complete",
                  "POST",
                  new JSONObject()
                      .put("flow", flow.getString("flow"))
                      .put("verifier", flow.getString("verifier")));
          if (result.has("token")) {
            api.token(result.getString("token"));
            api.set("onlyideas.native.flow", null);
          }
          return result;
        },
        r -> {
          busy = false;
          if (r.has("token")) {
            authEpoch++;
            refresh();
            if (page.equals("profile")) showProfile();
          }
        });
  }

  void signOut() {
    job(
        () -> {
          try {
            api.json("/api/auth/logout", "POST", new JSONObject());
          } catch (Exception ignored) {
          }
          api.token(null);
          api.set("onlyideas.native.flow", null);
          return true;
        },
        r -> {
          authEpoch++;
          account = null;
          chatId = "";
          chatMessages = new JSONArray();
          document = null;
          agentStatus = "";
          getPreferences(MODE_PRIVATE).edit().remove("account").apply();
          clearPrivateDownloads();
          clearExports();
          android.webkit.WebStorage.getInstance().deleteAllData();
          showProfile();
          refresh();
        });
  }

  void restoreLibrary() {
    String owner = account == null ? "public" : account.optString("id");
    try {
      if (owner.equals(getPreferences(MODE_PRIVATE).getString("libraryOwner", "public")))
        papers = new JSONArray(getPreferences(MODE_PRIVATE).getString("library", "[]"));
    } catch (Exception ignored) { }
    if (papers.length() == 0) for (JSONObject d : downloads()) papers.put(d.optJSONObject("paper"));
  }

  void warmLibrary(JSONArray summaries) {
    if (cacheWarmup != null) cacheWarmup.cancel(true);
    int epoch = authEpoch;
    cacheWarmup = io.submit(() -> {
      Map<String,String> visible = new HashMap<>();
      for (int i = 0; i < summaries.length(); i++) { JSONObject p = summaries.optJSONObject(i); visible.put(p.optString("id"), p.optString("visibility")); }
      synchronized (cacheLock) {
        if (epoch != authEpoch) return;
        for (JSONObject d : downloads()) { JSONObject p = d.optJSONObject("paper"); if (!Objects.equals(visible.get(p.optString("id")), p.optString("visibility"))) removeCached(p.optString("id")); }
      }
      for (int i = 0; i < Math.min(3, summaries.length()); i++) {
        if (Thread.currentThread().isInterrupted() || epoch != authEpoch) return;
        JSONObject p = summaries.optJSONObject(i), saved = cachedPaper(p.optString("id"));
        if (saved != null) {
          JSONObject old = saved.optJSONObject("paper");
          if (old.optString("revision").equals(p.optString("revision")) && old.optString("title").equals(p.optString("title")) && old.optString("visibility").equals(p.optString("visibility"))) continue;
        }
        try { fetchPaper(p); } catch (Exception ignored) { }
      }
    });
  }

  void clearExports() {
    File dir = new File(getCacheDir(), "exports");
    File[] files = dir.listFiles();
    if (files != null) for (File f : files) f.delete();
  }

  byte[] readFileBytes(File file) throws IOException {
    try (FileInputStream in = new FileInputStream(file);
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] b = new byte[8192];
      int n;
      while ((n = in.read(b)) != -1) {
        if (out.size() + n > 70_000_000) throw new IOException("Saved paper is too large.");
        out.write(b, 0, n);
      }
      return out.toByteArray();
    }
  }

  File folder() {
    File f = new File(getFilesDir(), "NativeDownloads");
    f.mkdirs();
    return f;
  }

  File paperFile(String id) {
    try {
      return new File(
          folder(),
          Base64.encodeToString(
                  MessageDigest.getInstance("SHA-256").digest(id.getBytes(StandardCharsets.UTF_8)),
                  Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING)
              + ".json");
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  File metadataFile(File file) {
    return new File(file.getParentFile(), file.getName() + ".meta");
  }

  void saveMetadata(File file, JSONObject document) throws Exception {
    JSONObject paper = new JSONObject(document.getJSONObject("paper").toString());
    paper.remove("mmd");
    paper.remove("sections");
    JSONObject summary =
        new JSONObject().put("paper", paper).put("owner", document.optString("owner")).put("pinned", document.optBoolean("pinned", true)).put("accessed", document.optLong("accessed", 0));
    try (FileOutputStream out = new FileOutputStream(metadataFile(file))) {
      out.write(summary.toString().getBytes(StandardCharsets.UTF_8));
    }
  }

  JSONObject metadata(File file) throws Exception {
    File meta = metadataFile(file);
    if (!meta.exists())
      saveMetadata(file, new JSONObject(new String(readFileBytes(file), StandardCharsets.UTF_8)));
    return new JSONObject(new String(readFileBytes(meta), StandardCharsets.UTF_8));
  }

  ArrayList<JSONObject> downloads() {
    ArrayList<JSONObject> result = new ArrayList<>();
    File[] files = folder().listFiles();
    if (files != null)
      for (File f : files)
        if (f.getName().endsWith(".json"))
          try {
            JSONObject d = metadata(f);
            if (d.optString("owner").equals("public")
                || account != null && d.optString("owner").equals(account.optString("id")))
              result.add(d);
          } catch (Exception ignored) {
          }
    return result;
  }

  void clearPrivateDownloads() {
    if (cacheWarmup != null) cacheWarmup.cancel(true);
    getPreferences(MODE_PRIVATE).edit().remove("library").remove("libraryOwner").apply();
    JSONArray publicOnly = new JSONArray();
    for (int i = 0; i < papers.length(); i++) { JSONObject p = papers.optJSONObject(i); if (p != null && p.optString("visibility").equals("public")) publicOnly.put(p); }
    papers = publicOnly;
    File[] files = folder().listFiles();
    if (files != null)
      for (File f : files)
        if (f.getName().endsWith(".json")) {
          try {
            if (metadata(f).optString("owner").equals("public")) continue;
          } catch (Exception ignored) {
          }
          f.delete();
          metadataFile(f).delete();
        }
  }

  JSONObject cachedPaper(String id) {
    synchronized (cacheLock) {
      try {
        JSONObject d = new JSONObject(new String(readFileBytes(paperFile(id)), StandardCharsets.UTF_8));
        if (d.optString("owner").equals("public") || account != null && d.optString("owner").equals(account.optString("id"))) return d;
      } catch (Exception ignored) { }
      return null;
    }
  }

  boolean isPinned(String id) {
    try { return paperFile(id).exists() && metadata(paperFile(id)).optBoolean("pinned", true); }
    catch (Exception ignored) { return false; }
  }

  void removeCached(String id) {
    synchronized (cacheLock) { File f = paperFile(id); f.delete(); metadataFile(f).delete(); }
  }

  void saveCached(JSONObject doc) throws Exception {
    synchronized (cacheLock) {
      if (!doc.optString("owner").equals("public") && (account == null || !doc.optString("owner").equals(account.optString("id")))) return;
      File file = paperFile(doc.getJSONObject("paper").getString("id"));
      File stage = new File(folder(), file.getName() + ".tmp");
      try (FileOutputStream out = new FileOutputStream(stage)) { out.write(doc.toString().getBytes(StandardCharsets.UTF_8)); }
      if (!stage.renameTo(file)) throw new IOException("Could not cache this paper.");
      saveMetadata(file, doc);
      ArrayList<JSONObject> recent = downloads(); recent.removeIf(d -> d.optBoolean("pinned", true));
      recent.sort((a,b) -> Long.compare(b.optLong("accessed"), a.optLong("accessed")));
      long bytes = 0; int count = 0;
      for (JSONObject d : recent) {
        String id = d.optJSONObject("paper").optString("id"); bytes += paperFile(id).length();
        if (++count > 20 || bytes > 150_000_000) removeCached(id);
      }
    }
  }

  JSONObject fetchPaper(JSONObject paper) throws Exception {
    String id = paper.getString("id"), token = api.token(), owner = account == null ? "private" : account.optString("id");
    int epoch = authEpoch;
    JSONObject saved = cachedPaper(id);
    try {
      JSONObject full = api.json("/api/papers/" + id, "GET", null).getJSONObject("paper"), figures = new JSONObject();
      JSONArray sections = full.optJSONArray("sections");
      if (sections != null) for (int i = 0; i < sections.length(); i++) sections.optJSONObject(i).remove("text");
      JSONArray assets = full.optJSONArray("assets"); int total = 0;
      boolean same = saved != null && saved.getJSONObject("paper").optString("revision").equals(full.optString("revision"));
      if (assets != null) for (int i = 0; i < assets.length(); i++) {
        if (epoch != authEpoch || !Objects.equals(token, api.token()) || Thread.currentThread().isInterrupted()) throw new InterruptedException();
        String path = assets.getJSONObject(i).getString("path");
        if (!path.startsWith("figures/") || path.contains("..")) continue;
        if (same && saved.getJSONObject("figures").has(path)) { figures.put(path, saved.getJSONObject("figures").getString(path)); continue; }
        byte[] bytes = api.bytes("/content/" + id + "/" + path, "GET", null, null, null);
        total += bytes.length; if (total > 50_000_000) throw new IOException("This paper is too large to cache.");
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String mime = ext.equals("svg") ? "image/svg+xml" : ext.equals("jpg") ? "image/jpeg" : "image/" + ext;
        figures.put(path, "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP));
      }
      JSONObject d = new JSONObject().put("paper", full).put("figures", figures)
          .put("owner", full.optString("visibility").equals("public") ? "public" : owner)
          .put("pinned", saved != null && saved.optBoolean("pinned", true)).put("accessed", System.currentTimeMillis());
      synchronized (cacheLock) {
        if (epoch != authEpoch || !Objects.equals(token, api.token()) || Thread.currentThread().isInterrupted()) throw new InterruptedException();
        saveCached(d);
      }
      return d;
    } catch (Exception e) {
      if (e instanceof NativeSession.HttpError && Arrays.asList(401,403,404).contains(((NativeSession.HttpError)e).status)) { removeCached(id); throw e; }
      if (epoch != authEpoch || !Objects.equals(token, api.token()) || Thread.currentThread().isInterrupted()) throw e;
      if (saved != null) return saved;
      throw e;
    }
  }

  void openPaper(JSONObject paper) {
    int request = ++readerRequest, epoch = authEpoch;
    clear("reader"); document = null;
    content.addView(text("Opening your paper…", 18, false));
    io.execute(() -> {
      JSONObject cached = cachedPaper(paper.optString("id"));
      if (cached != null) handler.post(() -> {
        if (epoch == authEpoch && request == readerRequest && page.equals("reader")) { document = cached; derived = false; showReader(); }
      });
      try {
        JSONObject fresh = fetchPaper(paper);
        handler.post(() -> {
          if (epoch != authEpoch || request != readerRequest || !page.equals("reader")) return;
          String old = document == null ? "" : document.optJSONObject("paper").optString("revision");
          document = fresh; derived = false;
          if (reader == null) showReader();
          else if (!old.equals(fresh.optJSONObject("paper").optString("revision"))) renderDocument(reader);
        });
      } catch (Exception e) {
        handler.post(() -> {
          if (epoch != authEpoch || request != readerRequest || !page.equals("reader")) return;
          if (cachedPaper(paper.optString("id")) == null) { showLibrary(); alert(e.getMessage() == null ? "Could not open this paper." : e.getMessage()); }
        });
      }
    });
  }

  void showReader() {
    clear("reader");
    header.removeAllViews();
    Button back = button("‹", false, this::showLibrary);
    back.setContentDescription("Back to library");
    back.setMinWidth(dp(44)); back.setMinimumWidth(dp(44));
    header.addView(back, new LinearLayout.LayoutParams(dp(44), dp(44)));
    TextView title = text(document.optJSONObject("paper").optString("title"), 17, true);
    title.setMaxLines(1);
    title.setEllipsize(android.text.TextUtils.TruncateAt.END);
    title.setPadding(dp(14), 0, dp(10), 0);
    header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
    Button more = button("⋯", false, this::readerMenu);
    more.setContentDescription("Reading options");
    header.addView(more, new LinearLayout.LayoutParams(dp(48), dp(48)));
    reader = new WebView(this);
    reader.setBackgroundColor(surface);
    reader.setHorizontalScrollBarEnabled(false);
    reader.setOverScrollMode(View.OVER_SCROLL_NEVER);
    reader.getSettings().setTextZoom(100);
    reader.getSettings().setJavaScriptEnabled(true);
    reader.getSettings().setAllowFileAccess(false);
    reader.getSettings().setAllowContentAccess(false);
    reader.getSettings().setBlockNetworkLoads(true);
    reader.addJavascriptInterface(
        new Object() {
          @JavascriptInterface
          public void ready() {
            handler.post(
                () -> {
                  if (reader != null) renderDocument(reader);
                });
          }

          @JavascriptInterface
          public void selection(String value) {
            handler.post(() -> {
              quote = value;
              View bar = content.findViewWithTag("selection-action");
              if (bar != null) bar.setVisibility(value.isEmpty() ? View.GONE : View.VISIBLE);
            });
          }
        },
        "NativeReader");
    WebViewAssetLoader assets =
        new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
    reader.setWebViewClient(
        new WebViewClient() {
          @Override
          public WebResourceResponse shouldInterceptRequest(
              WebView view, WebResourceRequest request) {
            WebResourceResponse r = assets.shouldInterceptRequest(request.getUrl());
            return r != null
                ? r
                : new WebResourceResponse(
                    "text/plain",
                    "UTF-8",
                    403,
                    "Blocked",
                    Collections.emptyMap(),
                    new ByteArrayInputStream(new byte[0]));
          }

          @Override
          public void onPageFinished(WebView view, String url) {
            renderDocument(view);
          }
        });
    content.addView(reader, new LinearLayout.LayoutParams(-1, 0, 1));
    Button discuss = button("Discuss paper or selected passage", false, this::discussion);
    discuss.setTag("selection-action"); discuss.setVisibility(View.GONE);
    content.addView(discuss, new LinearLayout.LayoutParams(-1, dp(44)));
    reader.loadUrl("https://appassets.androidplatform.net/assets/public/native-reader.html");
  }

  void renderDocument(WebView view) {
    try {
      JSONObject payload =
          new JSONObject()
              .put("mmd", document.getJSONObject("paper").optString("mmd"))
              .put("figures", document.getJSONObject("figures"))
              .put("fontSize", scaledReaderSize())
              .put(
                  "dark",
                  (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                      == Configuration.UI_MODE_NIGHT_YES);
      view.evaluateJavascript(
          "window.OnlyIdeasRender && window.OnlyIdeasRender(" + payload + ")", null);
    } catch (Exception e) {
      alert(e.getMessage());
    }
  }

  float scaledReaderSize() {
    return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP, fontSize(), getResources().getDisplayMetrics())
        / getResources().getDisplayMetrics().density;
  }

  void readerMenu() {
    new AlertDialog.Builder(this)
        .setTitle("Reading options")
        .setItems(
            new String[] {
              "Larger text",
              "Smaller text",
              isPinned(document.optJSONObject("paper").optString("id"))
                  ? "Unpin offline copy"
                  : "Keep offline",
              "Export Markdown",
              "Discuss selection",
              "Notes, guides & translation"
            },
            (d, n) -> {
              if (n < 2) {
                getPreferences(MODE_PRIVATE)
                    .edit()
                    .putInt("font", Math.max(15, Math.min(34, fontSize() + (n == 0 ? 1 : -1))))
                    .apply();
                boolean dark =
                    (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                        == Configuration.UI_MODE_NIGHT_YES;
                reader.evaluateJavascript(
                    "window.OnlyIdeasStyle(" + scaledReaderSize() + "," + dark + ")", null);
              } else if (n == 2) toggleDownload();
              else if (n == 3) sharePaper();
              else if (n == 4) discussion();
              else readingTools();
            })
        .setNegativeButton("Done", null)
        .show();
  }

  void toggleDownload() {
    if (derived) {
      toast("Reopen the original paper to manage its offline download.");
      return;
    }
    JSONObject doc = document;
    job(
        () -> {
          String id = doc.getJSONObject("paper").getString("id");
          boolean pin = !isPinned(id);
          long pinned = downloads().stream().filter(d -> d.optBoolean("pinned", true)).count();
          if (pin && pinned >= 30) throw new Exception("Unpin a download before saving another paper.");
          doc.put("pinned", pin).put("accessed", System.currentTimeMillis()); saveCached(doc);
          return pin ? "Kept offline. Recent papers also cache automatically." : "Unpinned. The recent reading cache is managed automatically.";
        },
        this::toast);
  }

  void sharePaper() {
    try {
      File folder = new File(getCacheDir(), "exports");
      folder.mkdirs();
      File file =
          new File(folder, "paper-" + document.getJSONObject("paper").getString("id") + ".mmd");
      try (FileOutputStream out = new FileOutputStream(file)) {
        out.write(
            document.getJSONObject("paper").optString("mmd").getBytes(StandardCharsets.UTF_8));
      }
      Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
      Intent share = new Intent(Intent.ACTION_SEND);
      share.setType("text/markdown");
      share.putExtra(Intent.EXTRA_STREAM, uri);
      share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      startActivity(Intent.createChooser(share, "Save or share Markdown"));
    } catch (Exception e) {
      alert(e.getMessage());
    }
  }

  void discussion() {
    if (derived) {
      toast("Reopen the original paper to discuss a passage.");
      return;
    }
    String id = document.optJSONObject("paper").optString("id");
    job(
        () -> api.json("/api/papers/" + id + "/comments", "GET", null),
        r -> {
          ScrollView scroll = new ScrollView(this);
          LinearLayout c = column();
          c.setPadding(dp(22), dp(16), dp(22), dp(20));
          scroll.addView(c);
          if (!quote.isEmpty()) {
            caption(c, quote);
            gap(c, 10);
          }
          JSONArray comments = r.optJSONArray("comments");
          if (comments != null)
            for (int i = 0; i < comments.length(); i++) {
              JSONObject m = comments.optJSONObject(i);
              title(c, m.optString("author"), 17);
              gap(c, 5);
              c.addView(text(m.optString("text"), 19, false));
              if (m.optBoolean("pending")) caption(c, "Waiting for community review");
              if (account != null) {
                if (m.optBoolean("canDelete")) c.addView(button("Delete comment", false, () ->
                  new AlertDialog.Builder(this).setTitle("Delete your comment?").setNegativeButton("Cancel", null)
                    .setPositiveButton("Delete", (d,w) -> job(() -> api.json("/api/comments/" + m.optString("id"), "DELETE", null), x -> { toast("Comment deleted. Reopen discussion to refresh."); }))
                    .show()));
                else {
                  c.addView(button("Report", false, () -> {
                    EditText reason = new EditText(this); reason.setHint("What should we review?"); reason.setTextSize(18);
                    new AlertDialog.Builder(this).setTitle("Report comment").setView(reason).setNegativeButton("Cancel", null)
                      .setPositiveButton("Send report", (d,w) -> job(() -> api.json("/api/comments/" + m.optString("id") + "/report", "POST", object("reason", reason.getText().toString())), x -> toast("Report sent."))).show();
                  }));
                  c.addView(button("Block reader", false, () -> job(() -> api.json("/api/comments/" + m.optString("id") + "/block", "POST", new JSONObject()), x -> {
                    toast("Reader blocked. Reopen discussion to refresh.");
                  })));
                }
              }
              gap(c, 10);
            }
          if (comments == null || comments.length() == 0)
            caption(c, "What caught your attention? Leave the first thought.");
          boolean isPublic = "public".equals(document.optJSONObject("paper").optString("visibility"));
          android.widget.CheckBox terms = new android.widget.CheckBox(this);
          terms.setText("I accept the Community Terms"); terms.setTextSize(18); terms.setTextColor(ink);
          if (isPublic) {
            c.addView(terms);
            c.addView(button("Read Community Terms", false, () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/terms.html")))));
            caption(c, "Public comments are reviewed before other readers can see them.");
          }
          EditText draft = new EditText(this);
          draft.setHint("Your thought…");
          draft.setTextSize(19);
          draft.setTextColor(ink);
          draft.setMinLines(3);
          draft.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
          c.addView(draft);
          AlertDialog dialog =
              new AlertDialog.Builder(this)
                  .setTitle("Discussion")
                  .setView(scroll)
                  .setNegativeButton("Done", null)
                  .setPositiveButton("Post", null)
                  .create();
          dialog.setOnShowListener(
              v ->
                  dialog
                      .getButton(AlertDialog.BUTTON_POSITIVE)
                      .setOnClickListener(
                          w -> {
                            if (account == null) {
                              dialog.dismiss();
                              signIn();
                              return;
                            }
                            if (draft.getText().toString().trim().isEmpty()) return;
                            if (isPublic && !terms.isChecked()) { toast("Please read and accept the Community Terms."); return; }
                            job(
                                () ->
                                    api.json(
                                        "/api/papers/" + id + "/comments",
                                        "POST",
                                        new JSONObject()
                                            .put("text", draft.getText().toString())
                                            .put("acceptTerms", terms.isChecked())
                                            .put("quote", quote)
                                            .put("id", UUID.randomUUID().toString())
                                            .put(
                                                "revision",
                                                document
                                                    .optJSONObject("paper")
                                                    .optString("revision"))),
                                result -> {
                                  dialog.dismiss();
                                  discussion();
                                });
                          }));
          dialog.show();
        });
  }

  void readingTools() {
    if (derived) {
      toast("Reopen the original paper to use reading tools.");
      return;
    }
    if (account == null) {
      signIn();
      return;
    }
    String id = document.optJSONObject("paper").optString("id");
    job(
        () -> api.json("/api/papers/" + id + "/notes", "GET", null),
        r -> {
          ScrollView scroll = new ScrollView(this);
          LinearLayout c = column();
          c.setPadding(dp(22), dp(18), dp(22), dp(22));
          scroll.addView(c);
          title(c, "Private notes", 22);
          gap(c, 12);
          EditText notes = new EditText(this);
          notes.setText(r.optString("text"));
          notes.setHint("Keep a thought for yourself…");
          notes.setTextSize(19);
          notes.setTextColor(ink);
          notes.setMinLines(4);
          notes.setGravity(Gravity.TOP);
          c.addView(notes);
          c.addView(
              button(
                  "Save notes",
                  true,
                  () ->
                      job(
                          () ->
                              api.json(
                                  "/api/papers/" + id + "/notes",
                                  "PUT",
                                  object("text", notes.getText().toString())),
                          v -> toast("Your private notes are saved."))));
          gap(c, 14);
          title(c, "Read in another way", 22);
          gap(c, 12);
          String[] labels = {
            "English",
            "简体中文",
            "繁體中文",
            "日本語",
            "한국어",
            "Français",
            "Deutsch",
            "Español",
            "العربية",
            "Русский",
            "Tiếng Việt"
          };
          String[] languages = {
            "en", "zh-Hans", "zh-Hant", "ja", "ko", "fr", "de", "es", "ar", "ru", "vi"
          };
          Spinner language = new Spinner(this);
          language.setAdapter(
              new ArrayAdapter<String>(
                  this, android.R.layout.simple_spinner_dropdown_item, labels));
          language.setSelection(1);
          language.setContentDescription("Reading language");
          c.addView(language, new LinearLayout.LayoutParams(-1, dp(54)));
          JSONArray sections = document.optJSONObject("paper").optJSONArray("sections");
          ArrayList<String> sectionLabels = new ArrayList<>();
          sectionLabels.add("Whole paper");
          if (sections != null)
            for (int i = 0; i < sections.length(); i++)
              sectionLabels.add(sections.optJSONObject(i).optString("title"));
          Spinner passage = new Spinner(this);
          passage.setAdapter(
              new ArrayAdapter<String>(
                  this, android.R.layout.simple_spinner_dropdown_item, sectionLabels));
          passage.setContentDescription("Passage");
          c.addView(passage, new LinearLayout.LayoutParams(-1, dp(54)));
          for (String kind : new String[] {"digest", "translation"}) {
            gap(c, 12);
            c.addView(
                button(
                    kind.equals("digest") ? "Create a reading guide" : "Translate",
                    false,
                    () ->
                        job(
                            () ->
                                api.json(
                                    "/api/papers/" + id + "/assist",
                                    "POST",
                                    new JSONObject()
                                        .put("kind", kind)
                                        .put(
                                            "language",
                                            languages[language.getSelectedItemPosition()])
                                        .put(
                                            "sectionId",
                                            passage.getSelectedItemPosition() == 0
                                                ? ""
                                                : sections
                                                    .optJSONObject(
                                                        passage.getSelectedItemPosition() - 1)
                                                    .optString("id"))),
                            v -> toast("Request saved. Open Saved results after it completes."))));
          }
          gap(c, 16);
          caption(
              c,
              "AI generated text can be wrong. Check it against the paper. Requests use your shared"
                  + " model allowance.");
          gap(c, 10);
          AlertDialog dialog =
              new AlertDialog.Builder(this)
                  .setTitle("Reading tools")
                  .setView(scroll)
                  .setNegativeButton("Done", null)
                  .create();
          c.addView(
              button(
                  "Saved guides & translations",
                  false,
                  () -> {
                    dialog.dismiss();
                    artifacts();
                  }));
          dialog.show();
        });
  }

  void artifacts() {
    String id = document.optJSONObject("paper").optString("id");
    job(
        () -> api.json("/api/papers/" + id + "/artifacts", "GET", null),
        r -> {
          JSONArray list = r.optJSONArray("artifacts");
          if (list == null || list.length() == 0) {
            toast("No results yet. Follow progress in Conversion requests.");
            return;
          }
          String[] labels = new String[list.length()];
          for (int i = 0; i < labels.length; i++) {
            JSONObject a = list.optJSONObject(i);
            labels[i] =
                (a.optString("kind").equals("digest") ? "Reading guide" : "Translation")
                    + " · "
                    + a.optString("language");
          }
          new AlertDialog.Builder(this)
              .setTitle("Saved results · AI generated")
              .setItems(
                  labels,
                  (d, n) -> {
                    try {
                      JSONObject a = list.optJSONObject(n),
                          copy = new JSONObject(document.toString());
                      copy.getJSONObject("paper")
                          .put("mmd", a.optString("text"))
                          .put("title", "AI generated · " + a.optString("model"));
                      document = copy;
                      derived = true;
                      showReader();
                      toast("AI generated result. Reopen the paper from Library for the original.");
                    } catch (Exception e) {
                      alert(e.getMessage());
                    }
                  })
              .setNegativeButton("Done", null)
              .show();
        });
  }

  void loadJobs(boolean show) {
    if (account == null) return;
    if (!show) {
      int epoch = authEpoch;
      io.execute(
          () -> {
            try {
              JSONObject r = api.json("/api/jobs", "GET", null);
              handler.post(
                  () -> {
                    if (epoch == authEpoch) jobs = r.optJSONArray("jobs");
                  });
            } catch (Exception ignored) {
            }
          });
      return;
    }
    job(
        () -> api.json("/api/jobs", "GET", null),
        r -> {
          jobs = r.optJSONArray("jobs");
          if (!show) return;
          String[] items = new String[jobs == null ? 0 : jobs.length()];
          for (int i = 0; i < items.length; i++) {
            JSONObject j = jobs.optJSONObject(i);
            items[i] = j.optString("state") + " · " + j.optString("message");
          }
          if (items.length == 0) {
            toast("Your conversion requests will appear here.");
            return;
          }
          new AlertDialog.Builder(this)
              .setTitle("Your requests")
              .setItems(
                  items,
                  (d, n) -> {
                    JSONObject j = jobs.optJSONObject(n);
                    if (j.optString("state").equals("completed") && j.has("paperId")) {
                      openPaper(object("id", j.optString("paperId")));
                      refresh();
                    } else if (j.optString("state").equals("failed")) {
                      new AlertDialog.Builder(this)
                          .setMessage(j.optString("message"))
                          .setNegativeButton("Close", null)
                          .setPositiveButton(
                              "Try again",
                              (x, y) ->
                                  job(
                                      () ->
                                          api.json(
                                              "/api/jobs/" + j.optString("id") + "/retry",
                                              "POST",
                                              new JSONObject()),
                                      v -> loadJobs(true)))
                          .show();
                    }
                  })
              .setNegativeButton("Done", null)
              .setNeutralButton("Refresh", (d, w) -> loadJobs(true))
              .show();
        });
  }

  @Override
  protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request != 42 || result != RESULT_OK || data == null || data.getData() == null) return;
    Uri uri = data.getData();
    busy = true;
    job(
        () -> {
          ByteArrayOutputStream out = new ByteArrayOutputStream();
          try (InputStream input = getContentResolver().openInputStream(uri)) {
            if (input == null) throw new Exception("Could not read this PDF.");
            byte[] b = new byte[8192];
            int n;
            while ((n = input.read(b)) != -1) {
              if (out.size() + n > 20_000_000)
                throw new Exception("Choose a PDF smaller than 20 MB.");
              out.write(b, 0, n);
            }
          }
          String title = "My paper";
          try (var cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
              int col = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
              if (col >= 0) title = cursor.getString(col).replaceAll("(?i)\\.pdf$", "");
            }
          }
          Map<String, String> headers = new HashMap<>();
          headers.put("X-Request-Id", UUID.randomUUID().toString());
          headers.put(
              "X-Paper-Title", java.net.URLEncoder.encode(title, "UTF-8").replace("+", "%20"));
          headers.put("X-Paper-Language", "en");
          headers.put("X-Paper-Sharing", shareUpload ? "shared" : "private");
          return api.bytes("/api/import", "POST", out.toByteArray(), "application/pdf", headers);
        },
        r -> {
          busy = false;
          toast("PDF queued for conversion.");
          loadJobs(true);
        });
  }
}
