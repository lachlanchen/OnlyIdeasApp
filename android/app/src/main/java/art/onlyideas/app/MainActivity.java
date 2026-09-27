package art.onlyideas.app;

import static androidx.appcompat.app.AppCompatDelegate.*;

import android.content.Intent;
import com.android.billingclient.api.ProductDetails;
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
  private NativeBilling billing;
  private JSONObject billingCatalog;
  private List<ProductDetails> billingProducts=List.of();
  private LinearLayout subscriptionContainer;
  private LinearLayout creditContainer;
  private String purchaseNotice="";
  private LinearLayout root, header, content, bottom, messages;
  private ScrollView chatScroll;
  private EditText composer;
  private LinearLayout attachmentTray;
  private final ArrayList<JSONObject> draftAttachments=new ArrayList<>();
  private String paragraphId="";
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
    if(api!=null&&account!=null)loadSubscriptions();
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
    if(billing!=null)billing.close();
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
    ink = Color.parseColor(dark ? "#edf0ff" : "#1d2544");
    muted = Color.parseColor(dark ? "#b8c3e3" : "#58627c");
    bg = Color.parseColor(dark ? "#111629" : "#f5f7ff");
    surface = Color.parseColor(dark ? "#1c2440" : "#ffffff");
    soft = Color.parseColor(dark ? "#2a3455" : "#e9e9ff");
    green = Color.parseColor(dark ? "#b7adff" : "#5745ce");
  }

  String language() {
    String value=getPreferences(MODE_PRIVATE).getString("language","system");
    if(value.equals("system"))value=Locale.getDefault().toLanguageTag();value=value.toLowerCase(Locale.ROOT);
    if(value.startsWith("zh"))return value.matches(".*(hant|tw|hk|mo).*")?"zh-Hant":"zh-Hans";
    for(String code:new String[]{"en","ja","ko","ar","es","fr","de","ru","vi"})if(value.equals(code)||value.startsWith(code+"-"))return code;
    return "en";
  }
  JSONObject localeCatalog;
  String t(String key) {
    if(key==null)return "";java.util.regex.Matcher progress=java.util.regex.Pattern.compile("^Translating (\\d+)/(\\d+)$").matcher(key);if(progress.matches())return t("Translating {current}/{total}").replace("{current}",progress.group(1)).replace("{total}",progress.group(2));
    try {if(localeCatalog==null)try(InputStream in=getAssets().open("public/locales.json")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);localeCatalog=new JSONObject(out.toString("UTF-8"));}
      JSONObject strings=localeCatalog.optJSONObject(language());return strings==null?key:strings.optString(key,key);
    }catch(Exception ignored){return key;}
  }
  String[] labels(String[] values){return Arrays.stream(values).map(this::t).toArray(String[]::new);}
  GradientDrawable vibrant() {GradientDrawable d=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.parseColor("#007e99"),Color.parseColor("#4355cd"),Color.parseColor("#7545c5")});d.setCornerRadius(dp(15));return d;}
  void chooseLanguage() {
    String[] codes={"system","en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};
    String[] names={t("System"),"English","简体中文","繁體中文","日本語","한국어","العربية","Español","Français","Deutsch","Русский","Tiếng Việt"};
    new AlertDialog.Builder(this).setTitle(t("App language")).setSingleChoiceItems(names,Arrays.asList(codes).indexOf(getPreferences(MODE_PRIVATE).getString("language","system")),(d,n)->{getPreferences(MODE_PRIVATE).edit().putString("language",codes[n]).apply();d.dismiss();buildRoot();showProfile();}).setNegativeButton(t("Cancel"),null).show();
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
    b.setText(t(label));
    b.setTextSize(16);
    b.setAllCaps(false);
    b.setElevation(0);
    b.setStateListAnimator(null);
    b.setTextColor(primary ? Color.WHITE : green);
    b.setMinHeight(dp(44));
    b.setMinimumHeight(dp(44));
    b.setPadding(dp(12), dp(7), dp(12), dp(7));
    b.setBackground(primary ? vibrant() : rounded(soft, 15));
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
    root.setLayoutDirection(language().equals("ar")?View.LAYOUT_DIRECTION_RTL:View.LAYOUT_DIRECTION_LTR);
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
    ViewCompat.setOnApplyWindowInsetsListener(
        root,
        (v, insets) -> {
          var bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
          var ime = insets.getInsets(WindowInsetsCompat.Type.ime());
          v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
          bottom.setVisibility(ime.bottom > bars.bottom ? View.GONE : View.VISIBLE);
          return insets;
        });
    setContentView(root);
    var controller=WindowCompat.getInsetsController(getWindow(),root);
    boolean light=(getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)!=Configuration.UI_MODE_NIGHT_YES;
    controller.setAppearanceLightStatusBars(light);controller.setAppearanceLightNavigationBars(light);
    getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);
    root.post(()->ViewCompat.requestApplyInsets(root));
  }

  void navigation(String name) {
    header.removeAllViews();
    TextView t = text(t(name), 22, true);
    header.addView(t, new LinearLayout.LayoutParams(0, -2, 1));
    Button profile = button(account == null ? "Profile" : initial(), false, () -> showProfile());
    profile.setContentDescription(t("Open profile"));
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
    quote = ""; paragraphId="";
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
        .setMessage(t(message))
        .setPositiveButton(t("OK"), null)
        .show();
  }

  void authorizeImport(boolean shared,boolean pdf,int retryCost,Consumer<Integer> done) {
    if(shared){done.accept(0);return;}
    final int epoch=authEpoch;
    job(()->api.json("/api/credits","GET",null),credits->{
      if(!credits.optBoolean("enabled")){done.accept(0);return;}
      int cost=retryCost>0?retryCost:pdf?credits.optInt("maxPDF",30):1;
      new AlertDialog.Builder(this).setTitle(t("Use reading credits?"))
        .setMessage(t("Use up to {count} credits? Failed imports and unused credits are refunded.").replace("{count}",String.valueOf(cost)))
        .setNegativeButton(t("Cancel"),null).setPositiveButton(t("Continue"),(d,w)->{if(epoch==authEpoch)done.accept(cost);}).show();
    });
  }
  String creditRules(JSONObject credits) {
    JSONObject policy=credits.optJSONObject("policy");
    return t("Shared papers earn {reward} credits once approved and published. Duplicate papers earn no extra credits. Up to {limit} credits per day.")
      .replace("{reward}",String.valueOf(policy==null?10:policy.optInt("publication")))
      .replace("{limit}",String.valueOf(policy==null?50:policy.optInt("rewardPerDay")))+"\n\n"+
      t("Private PDFs cost 1 credit per page; other files cost 1 credit. Credits never expire.");
  }
  Button sharingButton() {
    Button button=button("◎",false,()->{});button.setContentDescription(t("Sharing & credits"));
    button.setOnClickListener(v->{
      LinearLayout options=column();options.setPadding(dp(20),dp(12),dp(20),dp(12));
      RadioGroup choices=new RadioGroup(this);final int sharedID=View.generateViewId(),privateID=View.generateViewId();
      for(int i=0;i<2;i++){RadioButton choice=new RadioButton(this);choice.setId(i==0?sharedID:privateID);choice.setText(t(i==0?"Shared reading room":"Only me"));choice.setTextColor(ink);choice.setTextSize(17);choices.addView(choice);}
      choices.check(shareUpload?sharedID:privateID);options.addView(choices);
      caption(options,t("Shared after source and community review."));gap(options,12);
      caption(options,t("Share your own work or papers you have permission to publish."));gap(options,12);
      TextView rules=text("",15,false);options.addView(rules);
      caption(options,t("Your chats and notes stay private."));gap(options,12);
      caption(options,t("PDF and image recognition uses Mathpix. Word and text files are converted on the server."));
      ScrollView scroll=new ScrollView(this);scroll.addView(options);
      new AlertDialog.Builder(this).setTitle(t("Sharing & credits")).setView(scroll).setPositiveButton(t("Done"),(d,w)->{shareUpload=choices.getCheckedRadioButtonId()==sharedID;button.setText(t(shareUpload?"Shared":"Private"));if(page.equals("agent"))renderMessages();}).setNegativeButton(t("Cancel"),null).show();
      if(account!=null)job(()->api.json("/api/credits","GET",null),credits->{if(credits.optBoolean("enabled"))rules.setText(creditRules(credits)+"\n");});
    });button.setText(t(shareUpload?"Shared":"Private"));return button;
  }
  void renderCredits(LinearLayout container,JSONObject credits) {
    container.removeAllViews();
    LinearLayout card=card();title(card,t("Reading credits"),22);gap(card,12);
    title(card,String.valueOf(credits.optInt("balance")),36);caption(card,t("Available credits"));
    if(credits.optInt("held")>0)caption(card,t("Reserved for imports")+": "+credits.optInt("held"));
    gap(card,12);caption(card,creditRules(credits));
    card.addView(button(t("Credit history"),false,()->{
      JSONArray entries=credits.optJSONArray("history");ArrayList<String> lines=new ArrayList<>();
      Map<String,String> labels=Map.of("welcome","Welcome credits","private_import","Private import","unused_reservation","Unused reservation","failed_import","Import refund","public_reward","Public contribution","subscription","Monthly plan credits","purchase_refund","Purchase refund");
      if(entries!=null)for(int i=0;i<entries.length();i++){JSONObject e=entries.optJSONObject(i);if(e!=null)lines.add(t(labels.getOrDefault(e.optString("kind"),e.optString("kind")))+" · "+(e.optInt("delta")>0?"+":"")+e.optInt("delta")+"\n"+java.text.DateFormat.getDateInstance().format(new Date(e.optLong("created"))));}
      new AlertDialog.Builder(this).setTitle(t("Credit history")).setItems(lines.toArray(new String[0]),null).setPositiveButton(t("Done"),null).show();
    }));container.addView(card);gap(container,16);
  }

  void toast(String message) {
    Toast.makeText(this, t(message), Toast.LENGTH_LONG).show();
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
          if (r.has("error")) toast(t("Connection unavailable. Saved papers remain on this device."));
        });
  }

  void showLibrary() {
    clear("library");
    LinearLayout c = scrollContent();
    LinearLayout libraryTop=row();
    TextView heading=text(t("Your reading room"),20,true);libraryTop.addView(heading,new LinearLayout.LayoutParams(0,-2,1));
    libraryTop.addView(sharingButton());c.addView(libraryTop);
    gap(c, 10);
    caption(c, t("Read, ask, and make connections."));
    gap(c, 12);
    c.addView(
        button(
            t("＋  Add a paper"),
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
    gap(c, 14);
    if (offline) {
      caption(c, t("Offline · cached papers"));
      gap(c, 14);
    }
    LinearLayout searchBox = row();
    EditText search = new EditText(this);
    search.setSingleLine(true);
    search.setTextSize(16);
    search.setTextColor(ink);
    search.setHintTextColor(muted);
    search.setHint(t("Search your papers"));
    search.setPadding(dp(12), dp(8), dp(12), dp(8));
    search.setBackground(rounded(surface, 14));
    searchBox.addView(search, new LinearLayout.LayoutParams(0, dp(44), 1));
    c.addView(searchBox);
    gap(c, 12);
    title(c, t("Reading library"), 18);
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
    if (account != null) c.addView(button(t("Conversion requests"), false, () -> loadJobs(true)));
    gap(c, 12);
    c.addView(button(t("Refresh library"), false, this::refresh));
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
              + t(p.optString("visibility").equals("private") ? "Private" : "Reading room"));
      gap(card, 6);
      title(card, p.optString("title"), 18);
      gap(card, 6);
      TextView authors = text(p.optString("authors", "Personal paper"), 14, false);
      authors.setTextColor(muted); authors.setMaxLines(2); authors.setEllipsize(android.text.TextUtils.TruncateAt.END);
      card.addView(authors);
      card.setContentDescription(t("Open paper: ") + p.optString("title"));
      card.setFocusable(true); card.setOnClickListener(v -> openPaper(p));
      addCard(list, card);
    }
    if (list.getChildCount() == 0)
      caption(list, t("Add a PDF or ask the agent to find your next paper."));
  }

  void loadSubscriptions() {
    if(account==null||api==null)return;
    int epoch=authEpoch;
    io.execute(()->{
      try {
        JSONObject catalog=api.json("/api/billing","GET",null);
        handler.post(()->{
          if(isFinishing()||epoch!=authEpoch)return;
          billingCatalog=catalog;
          if(!catalog.optBoolean("enabled")||!catalog.optJSONObject("providers").optBoolean("google")){renderSubscriptions();return;}
          if(billing==null)billing=new NativeBilling(this,new NativeBilling.Host(){
            public void products(List<ProductDetails> products){billingProducts=products;renderSubscriptions();}
            public void notice(String value){purchaseNotice=t(value);renderSubscriptions();}
            public void deliver(String token,Runnable complete){
              int identity=authEpoch;
              io.execute(()->{
                try {
                  JSONObject result=api.json("/api/billing/google","POST",object("purchaseToken",token));
                  handler.post(()->{complete.run();if(identity!=authEpoch||isFinishing())return;billingCatalog=result;purchaseNotice=t("Your purchases are up to date.");if(page.equals("profile")&&creditContainer!=null&&result.optJSONObject("credits")!=null)renderCredits(creditContainer,result.optJSONObject("credits"));renderSubscriptions();});
                }catch(Exception error){handler.post(()->{complete.run();if(identity!=authEpoch||isFinishing())return;purchaseNotice=error.getMessage();renderSubscriptions();});}
              });
            }
          });
          ArrayList<String> ids=new ArrayList<>();JSONArray plans=catalog.optJSONArray("plans");
          if(plans!=null)for(int i=0;i<plans.length();i++)ids.add(plans.optJSONObject(i).optString("google"));
          billing.load(ids);renderSubscriptions();
        });
      } catch(Exception ignored) { /* Older servers keep billing hidden. */ }
    });
  }
  void renderSubscriptions() {
    if(!page.equals("profile")||subscriptionContainer==null)return;
    subscriptionContainer.removeAllViews();
    if(account==null||billingCatalog==null||!billingCatalog.optBoolean("enabled")||!billingCatalog.optJSONObject("providers").optBoolean("google"))return;
    LinearLayout card=card();title(card,t("Monthly plans"),22);gap(card,10);
    caption(card,t("Shared reading stays free. Choose a plan for more private imports and daily agent messages."));
    String active=billingCatalog.optString("plan","");
    if(!billingCatalog.optBoolean("canSubscribe"))caption(card,t("Manage your plan in the store where you subscribed."));
    JSONArray plans=billingCatalog.optJSONArray("plans");
    for(ProductDetails product:billingProducts) {
      ProductDetails.SubscriptionOfferDetails offer=NativeBilling.monthly(product);if(offer==null)continue;
      JSONObject plan=null;for(int i=0;i<plans.length();i++)if(plans.optJSONObject(i).optString("google").equals(product.getProductId()))plan=plans.optJSONObject(i);
      if(plan==null)continue;
      gap(card,18);title(card,t(plan.optString("name")),20);
      caption(card,t("{credits} credits each month · {messages} agent messages daily").replace("{credits}",String.valueOf(plan.optInt("credits"))).replace("{messages}",String.valueOf(plan.optInt("agentTurns"))));
      String price=offer.getPricingPhases().getPricingPhaseList().get(0).getFormattedPrice();
      caption(card,t("{price} / month").replace("{price}",price));
      Button buy=button(t(active.equals(plan.optString("id"))?"Current plan":"Subscribe"),true,()->billing.purchase(product,billingCatalog.optString("accountToken")));
      buy.setEnabled(billingCatalog.optBoolean("canSubscribe"));card.addView(buy);
    }
    if(billingProducts.isEmpty()&&!purchaseNotice.equals(t("Plans are currently unavailable in this store.")))caption(card,t("Plans are currently unavailable in this store."));
    if(!purchaseNotice.isEmpty())caption(card,purchaseNotice);
    gap(card,12);card.addView(button("Restore purchases",false,()->{if(billing!=null)billing.restore();}));
    card.addView(button("Manage subscription",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/account/subscriptions?package=art.onlyideas.app")))));
    caption(card,t("Subscriptions renew monthly until canceled in store settings. Unused credits do not expire. Service limits apply."));
    card.addView(button("Terms",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/terms.html")))));
    card.addView(button("Privacy",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")))));
    subscriptionContainer.addView(card);
  }

  void showProfile() {
    clear("profile");
    LinearLayout c = scrollContent();
    c.addView(button(t("App language"),false,this::chooseLanguage));
    gap(c,10);
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
      c.addView(button(t("Continue with GitHub"), true, this::signIn));
      gap(c, 12);
    }
    if(account!=null) {
      LinearLayout wallet=column();creditContainer=wallet;c.addView(wallet);
      job(()->api.json("/api/credits","GET",null),r->{if(page.equals("profile")&&r.optBoolean("enabled"))renderCredits(wallet,r);});
    }
    subscriptionContainer=column();c.addView(subscriptionContainer);renderSubscriptions();loadSubscriptions();
    LinearLayout reading = card();
    title(reading, t("Reading preferences"), 22);
    gap(reading, 18);
    TextView sample = text(t("A little more room for your next idea."), fontSize(), false);
    TextView size = text(t("Reading text · ") + fontSize() + " sp", 18, false);
    reading.addView(size);
    SeekBar slider = new SeekBar(this);
    slider.setMax(19);
    slider.setProgress(fontSize() - 15);
    slider.setContentDescription(t("Reading text size"));
    reading.addView(slider, new LinearLayout.LayoutParams(-1, dp(56)));
    reading.addView(sample);
    slider.setOnSeekBarChangeListener(
        new SeekBar.OnSeekBarChangeListener() {
          public void onProgressChanged(SeekBar s, int p, boolean user) {
            int n = p + 15;
            getPreferences(MODE_PRIVATE).edit().putInt("font", n).apply();
            size.setText(t("Reading text · ") + n + " sp");
            sample.setTextSize(n);
          }

          public void onStartTrackingTouch(SeekBar s) {}

          public void onStopTrackingTouch(SeekBar s) {}
        });
    gap(reading, 14);
    reading.addView(
        button(
            t("Appearance"),
            false,
            () ->
                new AlertDialog.Builder(this)
                    .setTitle(t("Appearance"))
                    .setItems(
                        labels(new String[] {"System", "Light", "Dark"}),
                        (d, n) -> {
                          int mode =
                              n == 0
                                  ? MODE_NIGHT_FOLLOW_SYSTEM
                                  : n == 1 ? MODE_NIGHT_NO : MODE_NIGHT_YES;
                          getPreferences(MODE_PRIVATE).edit().putInt("appearance", mode).apply();
                          androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(mode);
                        })
                    .setNegativeButton(t("Cancel"), null)
                    .show()));
    addCard(c, reading);
    LinearLayout library = card();
    title(library, t("Your library"), 22);
    gap(library, 12);
    caption(library, t("{count} papers cached on this device").replace("{count}",String.valueOf(downloads().size())));
    gap(library, 16);
    library.addView(button(t("Your agent conversations"), false, this::showAgent));
    addCard(c, library);
    LinearLayout about = card();
    title(about, "OnlyIdeas " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")", 22);
    gap(about, 12);
    caption(
        about,
        t("Read papers with their equations and figures. Search with the connected paper agent. Your conversations and personal papers stay in your account."));
    for (String policy : new String[]{"Support", "Privacy", "Terms"}) {
      about.addView(button(policy.equals("Terms") ? "Community Terms" : policy, false,
          () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/" + policy.toLowerCase(java.util.Locale.ROOT) + ".html")))));
    }
    addCard(c, about);
    if (account != null) {
      c.addView(button(t("Report content"), false, () -> reportContent("")));
      c.addView(button(t("Blocked readers"), false, this::blockedReaders));
      c.addView(button(t("Delete account"), false, () -> new AlertDialog.Builder(this)
        .setTitle(t("Permanently delete your account?"))
        .setMessage(t("Your account, cloud papers, notes, comments, chats and private downloads will be deleted and all sessions signed out. Previously published GitHub copies and others’ copies may remain under their public license. This cannot be undone.")+"\n\n"+t("Deleting your account does not cancel store subscriptions. Cancel your plan in subscription settings first."))
        .setNegativeButton(t("Cancel"), null)
        .setPositiveButton(t("Delete account"), (d,w) -> job(() -> api.json("/api/account", "DELETE", object("confirm", "DELETE")), r -> signOut()))
        .show()));
      gap(c, 12);
      Button signout =
          button(
              t("Sign out"),
              false,
              () ->
                  new AlertDialog.Builder(this)
                      .setTitle(t("Sign out on this device?"))
                      .setMessage(
                          t("Private offline downloads will be removed. Your cloud library and conversations will remain."))
                      .setNegativeButton(t("Cancel"), null)
                      .setPositiveButton(t("Sign out"), (d, w) -> signOut())
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
    actions.setPadding(dp(12), dp(2), dp(12), dp(6));
    Button history = button(t("History"), false, this::showHistory);
    actions.addView(history, new LinearLayout.LayoutParams(0, dp(48), 1));
    View space = new View(this);
    actions.addView(space, new LinearLayout.LayoutParams(dp(10), 1));
    actions.addView(
        button(
            t("New chat"),
            false,
            () -> {
              chatId = "";
              chatMessages = new JSONArray();
              agentStatus = "";
              showAgent();
            }),
        new LinearLayout.LayoutParams(0, dp(48), 1));
    actions.addView(sharingButton());
    content.addView(actions);
    chatScroll = new ScrollView(this);
    chatScroll.setFillViewport(true);
    messages = column();
    messages.setPadding(dp(14), dp(12), dp(14), dp(14));
    chatScroll.addView(messages);
    content.addView(chatScroll, new LinearLayout.LayoutParams(-1, 0, 1));
    progress = text(agentStatus, 16, false);
    progress.setTextColor(green);
    progress.setPadding(dp(22), dp(8), dp(22), dp(8));
    content.addView(progress);
    attachmentTray=column();attachmentTray.setPadding(dp(14),0,dp(14),0);content.addView(attachmentTray);renderDraftAttachments();
    LinearLayout compose = row();
    compose.setGravity(Gravity.BOTTOM);
    compose.setPadding(dp(12), dp(10), dp(12), dp(10));
    compose.setBackground(rounded(surface, 14));
    LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, -2);
    cp.setMargins(dp(16), dp(4), dp(16), dp(14));
    content.addView(compose, cp);
    Button attach=button("+",false,()->{
      if(account==null){signIn();return;}if(draftAttachments.size()>=3){toast(t("Attach up to three files."));return;}
      Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("*/*");pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/pdf","image/png","image/jpeg","image/webp","text/*","application/json","application/vnd.openxmlformats-officedocument.wordprocessingml.document"});startActivityForResult(pick,43);
    });attach.setContentDescription(t("Attach files"));compose.addView(attach,new LinearLayout.LayoutParams(dp(44),dp(48)));
    composer = new EditText(this);
    composer.setTextSize(17);
    composer.setTextColor(ink);
    composer.setHintTextColor(muted);
    composer.setHint(t("Ask or paste a paper link…"));
    composer.setContentDescription(t("Message the paper agent"));
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
    sendButton.setContentDescription(t("Send message"));
    compose.addView(sendButton, new LinearLayout.LayoutParams(dp(52), dp(52)));
    TextView privacy=text(t("Your chats and notes stay private."),12,false);privacy.setGravity(Gravity.CENTER);privacy.setTextColor(muted);content.addView(privacy);
    renderMessages();
    if (!chatId.isEmpty()) loadChat(false);
  }

  void renderDraftAttachments() {
    if(attachmentTray==null)return;attachmentTray.removeAllViews();
    for(JSONObject file:new ArrayList<>(draftAttachments)) {LinearLayout row=row();TextView name=text(file.optString("name"),14,false);row.addView(name,new LinearLayout.LayoutParams(0,-2,1));row.addView(button("×",false,()->{draftAttachments.remove(file);renderDraftAttachments();}));attachmentTray.addView(row);}
  }

  void renderMessages() {
    if (!page.equals("agent") || messages == null) return;
    messages.removeAllViews();
    if (chatMessages.length() == 0) {
      title(messages, t("What are you curious about?"), 27);
      gap(messages, 16);
      caption(
          messages,
          t("Find a paper. Ask about your files. Follow an idea."));
      gap(messages, 16);
      for (String topic :
          new String[] {
            "Find open papers about quantum entanglement", "Help me find research on language learning"
          }) {
        Button suggestion = button(topic, false, () -> send(t(topic)));
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
      caption(bubble, user ? t("You") : "OnlyIdeas");
      gap(bubble, 8);
      TextView body = text(user ? m.optString("text") : t(m.optString("text")), 17, false);
      body.setTextIsSelectable(true);
      bubble.addView(body);
      if (!user) bubble.addView(button(t("Report response"), false, () -> reportContent("Agent message " + m.optString("id") + " in conversation " + chatId)));
      JSONArray found = m.optJSONArray("papers");
      if (found != null)
        for (int j = 0; j < found.length(); j++) {
          JSONObject p = found.optJSONObject(j);
          if (p == null) continue;
          gap(bubble, 18);
          LinearLayout card = card();
          caption(card, p.optString("year") + " · " + t("Open paper"));
          gap(card, 6);
          title(card, p.optString("title"), 20);
          gap(card, 6);
          caption(card, p.optString("authors"));
          gap(card, 6);
          card.addView(
              button(
                  t("Read abstract"),
                  false,
                  () ->
                      new AlertDialog.Builder(this)
                          .setTitle(p.optString("title"))
                          .setMessage(p.optString("summary"))
                          .setPositiveButton(t("Done"), null)
                          .show()));
          gap(card, 6);
          caption(card,t(shareUpload ? "Shared after review":"Only me"));
          card.addView(button(t("Convert & add"),true,()->{
            final String conversation=chatId;final boolean shared=shareUpload;
            authorizeImport(shared,true,0,limit->job(()->api.json("/api/chats/"+conversation+"/import","POST",object("paperId",p.optString("id")).put("sharing",shared?"shared":"private").put("creditLimit",limit)),r->{toast(t("Paper queued for conversion."));loadChat(true);loadJobs(true);}));
          }));
          bubble.addView(card);
        }
      JSONArray attached=m.optJSONArray("attachments");
      if(attached!=null)for(int a=0;a<attached.length();a++){JSONObject file=attached.optJSONObject(a);caption(bubble,file.optString("name"));if(!file.optString("paperId").isEmpty())bubble.addView(button(t("Open paper"),false,()->openPaper(object("id",file.optString("paperId")))));else caption(bubble,t(file.optString("state").equals("failed")?"Could not prepare file":"Preparing your attachments"));}
      if (m.has("jobId")) {
        gap(bubble, 12);
        bubble.addView(button(t("View conversion"), false, () -> loadJobs(true)));
      }
      messages.addView(bubble);
      gap(messages, 14);
    }
    progress.setText(t(agentStatus));
    progress.setVisibility(agentStatus.isEmpty() ? View.GONE : View.VISIBLE);
    sendButton.setEnabled(agentStatus.isEmpty() && !busy);
  }

  void send(String text) {
    if (account == null) {
      signIn();
      return;
    }
    if ((text.trim().isEmpty() && draftAttachments.isEmpty()) || busy || !agentStatus.isEmpty()) return;
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
          api.json("/api/chats/" + id + "/messages", "POST", new JSONObject().put("text",text).put("attachments",new JSONArray(draftAttachments.stream().map(f->f.optString("id")).collect(java.util.stream.Collectors.toList()))).put("language",language()));
          return id;
        },
        id -> {
          busy = false;
          chatId = id;
          composer.setText("");draftAttachments.clear();renderDraftAttachments();
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
                    progress.setText(t(agentStatus));
                    progress.setVisibility(agentStatus.isEmpty() ? View.GONE : View.VISIBLE);
                    sendButton.setEnabled(agentStatus.isEmpty() && !busy);
                  }
                });
          } catch (Exception e) {
            handler.post(
                () -> {
                  refreshingChat = false;
                  if (page.equals("agent"))
                    progress.setText(t("Connection interrupted. Your conversation is saved."));
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
            toast(t("Your conversations will appear here."));
            return;
          }
          String[] titles = new String[chats.length()];
          for (int i = 0; i < titles.length; i++)
            titles[i] = chats.optJSONObject(i).optString("title");
          new AlertDialog.Builder(this)
              .setTitle(t("Conversations"))
              .setItems(
                  titles,
                  (d, n) -> {
                    chatId = chats.optJSONObject(n).optString("id");
                    lastMessages = "";
                    chatMessages = new JSONArray();
                    agentStatus = "";
                    showAgent();
                  })
              .setNegativeButton(t("Done"), null)
              .show();
        });
  }

  void reportContent(String context) {
    if (account == null) { signIn(); return; }
    EditText reason = new EditText(this); reason.setHint(t("Which paper or AI response concerns you, and why?")); reason.setTextSize(18); reason.setMinLines(4);
    AlertDialog dialog = new AlertDialog.Builder(this).setTitle(t("Report content")).setView(reason)
      .setNegativeButton(t("Cancel"), null).setPositiveButton(t("Send report"), null).create();
    dialog.setOnShowListener(v -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w -> {
      if (reason.getText().toString().trim().length() < 3) { reason.setError(t("Please describe the issue.")); return; }
      job(() -> api.json("/api/reports", "POST", new JSONObject().put("context",context).put("reason",reason.getText().toString())), r -> { dialog.dismiss(); toast(t("Report sent for review.")); });
    }));
    dialog.show();
  }

  void blockedReaders() {
    job(() -> api.json("/api/blocks", "GET", null), result -> {
      JSONArray blocks = result.optJSONArray("blocks");
      if (blocks == null || blocks.length() == 0) { alert(t("You have no blocked readers.")); return; }
      String[] names = new String[blocks.length()];
      for (int i=0; i<names.length; i++) names[i] = "Unblock " + blocks.optJSONObject(i).optString("name");
      new AlertDialog.Builder(this).setTitle(t("Blocked readers")).setItems(names, (d,n) ->
        job(() -> api.json("/api/blocks/" + blocks.optJSONObject(n).optString("id"), "DELETE", null), r -> blockedReaders()))
        .setNegativeButton(t("Done"), null).show();
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
            alert(t("Invalid sign-in address."));
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
          if(billing!=null){billing.close();billing=null;}billingCatalog=null;billingProducts=List.of();purchaseNotice="";
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
    draftAttachments.clear();
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
    content.addView(text(t("Opening your paper…"), 18, false));
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
    back.setContentDescription(t("Back to library"));
    back.setMinWidth(dp(44)); back.setMinimumWidth(dp(44));
    header.addView(back, new LinearLayout.LayoutParams(dp(44), dp(44)));
    TextView title = text(document.optJSONObject("paper").optString("title"), 17, true);
    title.setMaxLines(1);
    title.setEllipsize(android.text.TextUtils.TruncateAt.END);
    title.setPadding(dp(14), 0, dp(10), 0);
    header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
    Button more = button("⋯", false, this::readerMenu);
    more.setContentDescription(t("Reading options"));
    header.addView(more, new LinearLayout.LayoutParams(dp(48), dp(48)));
    if (derived) { TextView notice = text(t("AI generated result. Reopen the paper from Library for the original."), 14, false); notice.setPadding(dp(14), dp(6), dp(14), dp(6)); notice.setBackgroundColor(soft); content.addView(notice); }
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
          public void paragraph(String value,String id){handler.post(()->{quote=value;paragraphId=id;discussion();});}
          @JavascriptInterface
          public void selection(String value) {
            handler.post(() -> {
              quote = value; paragraphId="";
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
    Button discuss = button(t("Discuss paper or selected passage"), false, this::discussion);
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
              .put("fontSize", scaledReaderSize()).put("comments",!derived).put("commentLabel",t("Discuss paragraph")).put("language",document.optJSONObject("paper").optString("language","en"))
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
        .setTitle(t("Reading options"))
        .setItems(
            labels(new String[] {
              "Larger text",
              "Smaller text",
              isPinned(document.optJSONObject("paper").optString("id"))
                  ? "Unpin offline copy"
                  : "Keep offline",
              "Export Markdown",
              "Discuss selection",
              "Notes, guides & translation",
              "Read in another language"
            }),
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
              else if(n==5)readingTools(); else languagePicker();
            })
        .setNegativeButton(t("Done"), null)
        .show();
  }

  void toggleDownload() {
    if (derived) {
      toast(t("Reopen the original paper to manage its offline download."));
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
      toast(t("Reopen the original paper to discuss a passage."));
      return;
    }
    String id = document.optJSONObject("paper").optString("id");
    job(
        () -> api.json("/api/papers/" + id + "/comments", "GET", null),
        r -> {
          ScrollView scroll = new ScrollView(this);
          LinearLayout c = column();
          c.setFocusableInTouchMode(true);
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
              if(!paragraphId.isEmpty()&&!paragraphId.equals(m.optString("paragraphId")))continue;
              title(c, m.optString("author"), 17);
              gap(c, 5);
              c.addView(text(m.optString("text"), 19, false));
              if (m.optBoolean("pending")) caption(c, t("Waiting for community review"));
              if (account != null) {
                if (m.optBoolean("canDelete")) c.addView(button(t("Delete comment"), false, () ->
                  new AlertDialog.Builder(this).setTitle(t("Delete your comment?")).setNegativeButton(t("Cancel"), null)
                    .setPositiveButton(t("Delete"), (d,w) -> job(() -> api.json("/api/comments/" + m.optString("id"), "DELETE", null), x -> { toast(t("Comment deleted. Reopen discussion to refresh.")); }))
                    .show()));
                else {
                  c.addView(button(t("Report"), false, () -> {
                    EditText reason = new EditText(this); reason.setHint(t("What should we review?")); reason.setTextSize(18);
                    new AlertDialog.Builder(this).setTitle(t("Report comment")).setView(reason).setNegativeButton(t("Cancel"), null)
                      .setPositiveButton(t("Send report"), (d,w) -> job(() -> api.json("/api/comments/" + m.optString("id") + "/report", "POST", object("reason", reason.getText().toString())), x -> toast(t("Report sent.")))).show();
                  }));
                  c.addView(button(t("Block reader"), false, () -> job(() -> api.json("/api/comments/" + m.optString("id") + "/block", "POST", new JSONObject()), x -> {
                    toast(t("Reader blocked. Reopen discussion to refresh."));
                  })));
                }
              }
              gap(c, 10);
            }
          if (comments == null || comments.length() == 0)
            caption(c, t("What caught your attention? Leave the first thought."));
          boolean isPublic = "public".equals(document.optJSONObject("paper").optString("visibility"));
          android.widget.CheckBox terms = new android.widget.CheckBox(this);
          terms.setText(t("I accept the Community Terms")); terms.setTextSize(18); terms.setTextColor(ink);
          if (isPublic) {
            c.addView(terms);
            c.addView(button(t("Read Community Terms"), false, () -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/terms.html")))));
            caption(c, t("Public comments are reviewed before other readers can see them."));
          }
          EditText draft = new EditText(this);
          draft.setHint(t("Your thought…"));
          draft.setTextSize(19);
          draft.setTextColor(ink);
          draft.setMinLines(3);
          draft.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
          c.addView(draft);
          AlertDialog dialog =
              new AlertDialog.Builder(this)
                  .setTitle(t("Discussion"))
                  .setView(scroll)
                  .setNegativeButton(t("Done"), null)
                  .setPositiveButton(t("Post"), null)
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
                            if (isPublic && !terms.isChecked()) { toast(t("Please read and accept the Community Terms.")); return; }
                            job(
                                () ->
                                    api.json(
                                        "/api/papers/" + id + "/comments",
                                        "POST",
                                        new JSONObject()
                                            .put("text", draft.getText().toString())
                                            .put("acceptTerms", terms.isChecked())
                                            .put("quote", quote).put("paragraphId",paragraphId)
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
          // Wait until the dialog is laid out; opening a thread should show its
          // newest replies and composer without focusing it or opening the keyboard.
          c.requestFocus();
          scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
        });
  }

  void languagePicker() {
    if(derived){toast(t("Reopen the original paper to use reading tools."));return;}
    final String id=document.optJSONObject("paper").optString("id");
    job(()->api.json("/api/papers/"+id+"/artifacts","GET",null),response->{
      JSONArray artifacts=response.optJSONArray("artifacts");String[] codes={"en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};String[] names={"English","简体中文","繁體中文","日本語","한국어","العربية","Español","Français","Deutsch","Русский","Tiếng Việt"};
      Map<String,JSONObject> ready=new HashMap<>();if(artifacts!=null)for(int i=0;i<artifacts.length();i++){JSONObject a=artifacts.optJSONObject(i);if(a.optString("kind").equals("translation")&&(a.isNull("sectionId")||a.optString("sectionId").isEmpty()))ready.put(a.optString("language"),a);}
      for(int i=0;i<codes.length;i++)if(ready.containsKey(codes[i]))names[i]+=" ✓";
      new AlertDialog.Builder(this).setTitle(t("Read in another language")).setItems(names,(d,n)->{if(ready.containsKey(codes[n])){showArtifact(ready.get(codes[n]));return;}if(account==null){signIn();return;}job(()->api.json("/api/papers/"+id+"/assist","POST",new JSONObject().put("kind","translation").put("language",codes[n])),r->{toast(t("Translation requested. Existing work is reused."));loadJobs(true);});}).setNegativeButton(t("Done"),null).show();
    });
  }

  void showArtifact(JSONObject artifact) {
    try { JSONObject next=new JSONObject(document.toString());JSONObject p=next.getJSONObject("paper");p.put("mmd",artifact.getString("text")).put("revision",artifact.getString("id")).put("language",artifact.getString("language"));document=next;derived=true;showReader(); }
    catch(Exception e){alert(e.getMessage());}
  }

  void readingTools() {
    if (derived) {
      toast(t("Reopen the original paper to use reading tools."));
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
          title(c, t("Private notes"), 22);
          gap(c, 12);
          EditText notes = new EditText(this);
          notes.setText(r.optString("text"));
          notes.setHint(t("Keep a thought for yourself…"));
          notes.setTextSize(19);
          notes.setTextColor(ink);
          notes.setMinLines(4);
          notes.setGravity(Gravity.TOP);
          c.addView(notes);
          c.addView(
              button(
                  t("Save notes"),
                  true,
                  () ->
                      job(
                          () ->
                              api.json(
                                  "/api/papers/" + id + "/notes",
                                  "PUT",
                                  object("text", notes.getText().toString())),
                          v -> toast(t("Your private notes are saved.")))));
          gap(c, 14);
          title(c, t("Read in another way"), 22);
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
          language.setContentDescription(t("Reading language"));
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
          passage.setContentDescription(t("Passage"));
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
                            v -> toast(t("Request saved. Open Saved results after it completes.")))));
          }
          gap(c, 16);
          caption(
              c,
              t("AI generated text can be wrong. Check it against the paper. Requests use your shared model allowance."));
          gap(c, 10);
          AlertDialog dialog =
              new AlertDialog.Builder(this)
                  .setTitle(t("Reading tools"))
                  .setView(scroll)
                  .setNegativeButton(t("Done"), null)
                  .create();
          c.addView(
              button(
                  t("Saved guides & translations"),
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
            toast(t("No results yet. Follow progress in Conversion requests."));
            return;
          }
          String[] labels = new String[list.length()];
          for (int i = 0; i < labels.length; i++) {
            JSONObject a = list.optJSONObject(i);
            labels[i] =
                t(a.optString("kind").equals("digest") ? "Reading guide" : "Translation")
                    + " · "
                    + a.optString("language");
          }
          new AlertDialog.Builder(this)
              .setTitle(t("Saved results · AI generated"))
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
                      toast(t("AI generated result. Reopen the paper from Library for the original."));
                    } catch (Exception e) {
                      alert(e.getMessage());
                    }
                  })
              .setNegativeButton(t("Done"), null)
              .show();
        });
  }

  void acceptJobs(JSONArray next) {
    Map<String,String> previous=new HashMap<>();
    for(int i=0;i<jobs.length();i++) {JSONObject j=jobs.optJSONObject(i);if(j!=null)previous.put(j.optString("id"),j.optString("state"));}
    jobs=next==null?new JSONArray():next;
    boolean finished=false;
    for(int i=0;i<jobs.length();i++) {
      JSONObject j=jobs.optJSONObject(i);if(j==null)continue;
      String state=j.optString("state");
      if((state.equals("completed")||state.equals("failed"))&&!state.equals(previous.get(j.optString("id"))))finished=true;
    }
    if(finished)refresh();
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
                    if (epoch == authEpoch) acceptJobs(r.optJSONArray("jobs"));
                  });
            } catch (Exception ignored) {
            }
          });
      return;
    }
    job(
        () -> api.json("/api/jobs", "GET", null),
        r -> {
          acceptJobs(r.optJSONArray("jobs"));
          if (!show) return;
          String[] items = new String[jobs == null ? 0 : jobs.length()];
          for (int i = 0; i < items.length; i++) {
            JSONObject j = jobs.optJSONObject(i);
            items[i] = t(j.optString("state")) + " · " + t(j.optString("message"));
          }
          if (items.length == 0) {
            toast(t("Your conversion requests will appear here."));
            return;
          }
          new AlertDialog.Builder(this)
              .setTitle(t("Your requests"))
              .setItems(
                  items,
                  (d, n) -> {
                    JSONObject j = jobs.optJSONObject(n);
                    if (j.optString("state").equals("completed") && j.has("paperId")) {
                      openPaper(object("id", j.optString("paperId")));
                      refresh();
                    } else if (j.optString("state").equals("failed")) {
                      new AlertDialog.Builder(this)
                          .setMessage(t(j.optString("message")))
                          .setNegativeButton(t("Close"), null)
                          .setPositiveButton(
                              t("Try again"),
                              (x, y) -> authorizeImport(j.optInt("creditCost")==0,false,j.optInt("creditCost"),limit ->
                                  job(
                                      () ->
                                          api.json(
                                              "/api/jobs/" + j.optString("id") + "/retry",
                                              "POST",
                                              object("creditLimit",limit)),
                                      v -> loadJobs(true))))
                          .show();
                    }
                  })
              .setNegativeButton(t("Done"), null)
              .setNeutralButton(t("Refresh"), (d, w) -> loadJobs(true))
              .show();
        });
  }

  @Override
  protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if ((request != 42 && request != 43) || result != RESULT_OK || data == null || data.getData() == null) return;
    Uri uri = data.getData();
    String name="";
    try(var cursor=getContentResolver().query(uri,null,null,null,null)){if(cursor!=null&&cursor.moveToFirst()){int col=cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);if(col>=0)name=cursor.getString(col);}}catch(Exception ignored){}
    final boolean shared=shareUpload;
    authorizeImport(shared,request==42||name.toLowerCase(Locale.ROOT).endsWith(".pdf")||"application/pdf".equals(getContentResolver().getType(uri)),0,limit->uploadPicked(uri,request,shared,limit));
  }

  void uploadPicked(Uri uri,int request,boolean shared,int creditLimit) {
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
              if (col >= 0) title = request==43?cursor.getString(col):cursor.getString(col).replaceAll("(?i)\\.pdf$", "");
            }
          }
          Map<String, String> headers = new HashMap<>();
          headers.put("X-Paper-Sharing",shared?"shared":"private");headers.put("X-Credit-Limit",String.valueOf(creditLimit));
          if(request==43){headers.put("X-File-Name",java.net.URLEncoder.encode(title,"UTF-8").replace("+","%20"));return api.bytes("/api/attachments","POST",out.toByteArray(),"application/octet-stream",headers);}
          headers.put("X-Request-Id", UUID.randomUUID().toString());
          headers.put(
              "X-Paper-Title", java.net.URLEncoder.encode(title, "UTF-8").replace("+", "%20"));
          headers.put("X-Paper-Language", "en");
          headers.put("X-Paper-Sharing", shared ? "shared" : "private");
          return api.bytes("/api/import", "POST", out.toByteArray(), "application/pdf", headers);
        },
        r -> {
          busy = false;
          if(request==43){try{JSONObject file=new JSONObject(new String(r,StandardCharsets.UTF_8)).getJSONObject("attachment");if(draftAttachments.stream().noneMatch(a->a.optString("id").equals(file.optString("id"))))draftAttachments.add(file);renderDraftAttachments();toast(t("Attachment added."));}catch(Exception e){alert(e.getMessage());}return;}
          toast(t("PDF queued for conversion."));
          loadJobs(true);
        });
  }
}
