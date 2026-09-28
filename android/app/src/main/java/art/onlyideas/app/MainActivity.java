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
  private String readLanguage="zh-Hans",readingMode="original";
  private JSONObject alignedReading;
  private LinearLayout readerLanguages;
  private boolean translationPending=false;
  private int readingGeneration=0;
  private JSONArray papers = new JSONArray(),
      chats = new JSONArray(),
      chatMessages = new JSONArray(),
      jobs = new JSONArray();
  private String page = "library", readerReturn = "library", chatId = "", agentStatus = "", quote = "", lastMessages = "";
  private String uploadResearch="",uploadRecovery="",uploadOwner="";
  private boolean recoveryShared=true;
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
          returnFromReader();
        }
      };
  private long inboxChecked=0;
  private Button spaceNavigation;
  private final Runnable poll =
      new Runnable() {
        public void run() {
          if (page.equals("agent") && !chatId.isEmpty()) loadChat(false);
          if (account != null && !offline) {loadJobs(false);if(System.currentTimeMillis()-inboxChecked>30000){inboxChecked=System.currentTimeMillis();int epoch=authEpoch;job(()->api.json("/api/inbox","GET",null),r->{if(epoch==authEpoch&&spaceNavigation!=null)spaceNavigation.setText(t("Your space")+(r.optInt("unread")>0?" · "+r.optInt("unread"):""));},false);}}
          handler.postDelayed(this, 3500);
        }
      };

  @Override
  public void onCreate(Bundle saved) {
    androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
    super.onCreate(saved);
    if(saved!=null){uploadResearch=saved.getString("uploadResearch","");uploadRecovery=saved.getString("uploadRecovery","");uploadOwner=saved.getString("uploadOwner","");recoveryShared=saved.getBoolean("recoveryShared",true);}
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
    if(getIntent().getBooleanExtra("onlyideas.daily",false)){spaceTab="daily";showSpace();}
  }

  @Override
  public void onConfigurationChanged(Configuration next) {
    super.onConfigurationChanged(next);
    if (root == null) return;
    String current = page;
    buildRoot();
    if (current.equals("space")) showSpace();
    else if (current.equals("profile")) showProfile();
    else if (current.equals("plans")) showPlans();
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
    if(api!=null&&(account!=null||page.equals("plans")))loadSubscriptions();
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
    if(intent.getBooleanExtra("onlyideas.daily",false)){spaceTab="daily";showSpace();return;}
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
    String[] tabs = {"Library", "Agent", "Your space", "Profile"};
    for (String tab : tabs) {
      Button b =
          button(
              tab,
              false,
              () -> {
                if (tab.equals("Library")) showLibrary();
                else if (tab.equals("Agent")) showAgent();
                else if (tab.equals("Your space")) showSpace();
                else showProfile();
              });
      if(tab.equals("Your space"))spaceNavigation=b;
      b.setTextSize(13);
      b.setBackground(rounded(page.equals(tab.equals("Your space") ? "space" : tab.toLowerCase()) ? soft : surface, 14));
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
            : next.equals("space") ? "Your space" : next.equals("agent") ? "Agent" : next.equals("reader") ? "Reading" : "Profile");
  }

  <T> void job(Callable<T> work, Consumer<T> done) {
    job(work,done,true);
  }

  <T> void job(Callable<T> work, Consumer<T> done, boolean reportFailure) {
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
                  if (reportFailure && !isFinishing() && epoch == authEpoch) {
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
    LinearLayout libraryTop=row();libraryTop.addView(sharingButton(),new LinearLayout.LayoutParams(0,dp(44),1));
    libraryTop.addView(button(t("＋  Add a paper"),true,()->{if(account==null){signIn();return;}Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("application/pdf");pick.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(pick,42);}),new LinearLayout.LayoutParams(0,dp(44),1));c.addView(libraryTop);gap(c,10);
    if(offline){caption(c,t("Offline · cached papers"));gap(c,8);}
    LinearLayout searchBox = row();
    EditText search = new EditText(this);
    search.setSingleLine(true);
    search.setTextSize(16);
    search.setTextColor(ink);
    search.setHintTextColor(muted);
    search.setHint(t("Find a paper or ask to fetch it…"));
    search.setText(researchQuery);
    search.setPadding(dp(12), dp(8), dp(12), dp(8));
    search.setBackground(rounded(surface, 14));
    searchBox.addView(search, new LinearLayout.LayoutParams(0, dp(44), 1));
    Button ask=button("↑",true,()->{String text=search.getText().toString().trim();if(text.isEmpty())return;if(account==null){signIn();return;}chatId="";chatMessages=new JSONArray();showAgent();send(text);});ask.setContentDescription(t("Ask the agent"));searchBox.addView(ask,new LinearLayout.LayoutParams(dp(48),dp(44)));
    c.addView(searchBox);
    gap(c, 12);
    c.addView(button(t(browseResearch?"Reading library":"Research for you"),false,()->{browseResearch=!browseResearch;showLibrary();}));
    LinearLayout researchArea=column();
    if(!browseResearch){title(c,t("Reading library"),18);gap(c,10);}
    LinearLayout list = column();
    c.addView(list);
    renderLibrary(list, researchQuery);
    list.setVisibility(!browseResearch||!researchQuery.isEmpty()?View.VISIBLE:View.GONE);
    if(browseResearch){c.addView(researchArea);researchSetup(researchArea);}
    search.addTextChangedListener(
        new android.text.TextWatcher() {
          public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

          public void onTextChanged(CharSequence s, int start, int before, int count) {
            researchQuery=s.toString();renderLibrary(list,researchQuery);list.setVisibility(!browseResearch||!researchQuery.isEmpty()?View.VISIBLE:View.GONE);if(browseResearch)researchReset();
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
      if(p==null||!researchMatches(query,p.optString("title")+" "+p.optString("authors")+" "+researchMetadata(p)+" "+p.optString("doi")))continue;
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
      caption(card,researchMetadata(p));
      socialActions(card,p.optString("id"),p.optString("title"));
      addCard(list, card);
    }
    if (list.getChildCount() == 0)
      caption(list, t("Add a PDF or ask the agent to find your next paper."));
  }

  void loadSubscriptions() {
    if(api==null)return;
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
          billing.trialEligible=catalog.optBoolean("trialEligible");billing.load(ids);renderSubscriptions();
        });
      } catch(Exception error) {handler.post(()->{if(epoch==authEpoch&&!isFinishing()){purchaseNotice=t("Unable to load plans. Try again.");renderSubscriptions();}});}
    });
  }
  void renderSubscriptions() {
    if(!page.equals("plans")||subscriptionContainer==null)return;
    subscriptionContainer.removeAllViews();
    if(billingCatalog==null){caption(subscriptionContainer,purchaseNotice.isEmpty()?t("Loading…"):purchaseNotice);subscriptionContainer.addView(button("Try again",false,this::loadSubscriptions));return;}
    boolean available=billingCatalog.optBoolean("enabled")&&billingCatalog.optJSONObject("providers").optBoolean("google");
    LinearLayout card=card();title(card,t("Monthly plans"),22);gap(card,10);
    caption(card,t("Existing papers and cached translations are free to read. Plans cover new fetching and transcription."));
    JSONObject quota=billingCatalog.optJSONObject("quota");
    if(quota!=null&&quota.optBoolean("enabled")){caption(card,quota.optBoolean("unlimited")?t("Unlimited owner allowance"):t("{pages} transcription pages and {fetches} fetches remaining").replace("{pages}",String.valueOf(quota.optInt("remainingPages"))).replace("{fetches}",String.valueOf(quota.optInt("remainingFetches"))));if(!quota.optBoolean("unlimited"))caption(card,t("Renews on {date}").replace("{date}",java.text.DateFormat.getDateInstance().format(new java.util.Date(quota.optLong("ends")))));}
    if(billing!=null)billing.trialEligible=billingCatalog.optBoolean("trialEligible");
    String active=billingCatalog.optString("plan","");
    if(!available)caption(card,t("Subscriptions are coming soon. You can keep reading for free."));
    if(available&&!billingCatalog.optBoolean("canSubscribe"))caption(card,t("Manage your plan in the store where you subscribed."));
    JSONArray plans=billingCatalog.optJSONArray("plans");
    for(ProductDetails product:available?billingProducts:List.<ProductDetails>of()) {
      ProductDetails.SubscriptionOfferDetails offer=NativeBilling.monthly(product,billingCatalog.optBoolean("trialEligible"));if(offer==null)continue;
      JSONObject plan=null;for(int i=0;i<plans.length();i++)if(plans.optJSONObject(i).optString("google").equals(product.getProductId()))plan=plans.optJSONObject(i);
      if(plan==null)continue;
      gap(card,18);title(card,t(plan.optString("name")),20);
      caption(card,t("{credits} credits each month · {messages} agent messages daily").replace("{credits}",String.valueOf(plan.optInt("credits"))).replace("{messages}",String.valueOf(plan.optInt("agentTurns"))));
      caption(card,t("{pages} transcription pages · {fetches} new-paper fetches per month").replace("{pages}",String.valueOf(plan.optInt("pages",plan.optInt("credits")))).replace("{fetches}",String.valueOf(plan.optInt("fetches"))));
      List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();boolean trial=phases.size()==2&&phases.get(0).getPriceAmountMicros()==0;
      String price=phases.get(phases.size()-1).getFormattedPrice();
      if(trial)caption(card,t("7 days free, then {price} per month. Trial includes 50 pages and 10 fetches. Cancel before it ends to avoid payment.").replace("{price}",price));
      caption(card,t("{price} / month").replace("{price}",price));
      Button buy=button(t(active.equals(plan.optString("id"))?"Current plan":trial?"Start 7-day free trial":"Subscribe"),true,()->billing.purchase(product,billingCatalog.optString("accountToken")));
      buy.setEnabled(billingCatalog.optBoolean("canSubscribe"));card.addView(buy);
    }
    if(plans!=null)for(int i=0;i<plans.length();i++) {
      JSONObject plan=plans.optJSONObject(i);boolean found=false;
      if(available)for(ProductDetails p:billingProducts)if(p.getProductId().equals(plan.optString("google"))&&NativeBilling.monthly(p,billingCatalog.optBoolean("trialEligible"))!=null)found=true;
      if(found)continue;
      gap(card,18);title(card,t(plan.optString("name")),20);
      caption(card,t("Planned price: {price} / month").replace("{price}","US$"+plan.optString("targetUSD")));
      caption(card,t("{pages} transcription pages · {fetches} new-paper fetches per month").replace("{pages}",String.valueOf(plan.optInt("pages"))).replace("{fetches}",String.valueOf(plan.optInt("fetches"))));
      Button soon=button("Coming soon",false,()->{});soon.setEnabled(false);card.addView(soon);
    }
    if(!available)caption(card,t("Eligible subscribers get a 7-day trial when plans become available."));
    if(available&&billingProducts.isEmpty()&&!purchaseNotice.equals(t("Plans are currently unavailable in this store.")))caption(card,t("Plans are currently unavailable in this store."));
    if(!purchaseNotice.isEmpty())caption(card,purchaseNotice);
    gap(card,12);Button restore=button("Restore purchases",false,()->{if(billing!=null)billing.restore();});restore.setEnabled(available&&billing!=null);card.addView(restore);
    card.addView(button("Manage subscription",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/account/subscriptions?package=art.onlyideas.app")))));
    caption(card,t("Subscriptions renew monthly until canceled in store settings. Unused credits do not expire. Service limits apply."));
    card.addView(button("Terms",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/terms.html")))));
    card.addView(button("Privacy",false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")))));
    subscriptionContainer.addView(card);
  }

  void showPlans() {
    clear("plans");navigation("Monthly plans");
    LinearLayout c=scrollContent();c.addView(button("Back",false,this::showProfile));
    subscriptionContainer=column();c.addView(subscriptionContainer);renderSubscriptions();loadSubscriptions();
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
    c.addView(button("Plans & usage",true,this::showPlans));gap(c,12);
    if(account!=null) {
      c.addView(button(t("Saved, liked & activity"),false,this::showSpace));
      c.addView(button(t("Interests & notifications"),false,this::showReadingPreferences));
      LinearLayout wallet=column();creditContainer=wallet;c.addView(wallet);
      job(()->api.json("/api/credits","GET",null),r->{if(page.equals("profile")&&r.optBoolean("enabled"))renderCredits(wallet,r);});
    }
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
          if(!p.optString("paperId").isEmpty())card.addView(button(t("Open paper"),true,()->openPaper(object("id",p.optString("paperId")))));
          else {
          caption(card,t(shareUpload ? "Shared after review":"Only me"));
          card.addView(button(t("Fetch & read"),true,()->{
            final String conversation=chatId;final boolean shared=shareUpload;
            authorizeImport(shared,true,0,limit->job(()->api.json("/api/chats/"+conversation+"/import","POST",object("paperId",p.optString("id")).put("sharing",shared?"shared":"private").put("creditLimit",limit)),r->{toast(t("Paper queued for conversion."));loadChat(true);loadJobs(true);}));
          }));
          card.addView(button(t("Upload my PDF"),false,()->recoverPDF(p.optString("id"),"",shareUpload)));
          }
          if(p.optString("source").startsWith("https://"))card.addView(button(t("Source"),false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(p.optString("source"))))));
          bubble.addView(card);
        }
      JSONArray attached=m.optJSONArray("attachments");
      if(attached!=null)for(int a=0;a<attached.length();a++){JSONObject file=attached.optJSONObject(a);caption(bubble,file.optString("name"));if(!file.optString("paperId").isEmpty())bubble.addView(button(t("Open paper"),false,()->openPaper(object("id",file.optString("paperId")))));else caption(bubble,t(file.optString("state").equals("failed")?"Could not prepare file":"Preparing your attachments"));}
      if (m.has("jobId")) {
        gap(bubble, 12);
        bubble.addView(button(t("View conversion"), false, () -> loadJobs(true)));
      }
      JSONArray actions=m.optJSONArray("actions");
      if(actions!=null)for(int a=0;a<actions.length();a++){
        JSONObject action=actions.optJSONObject(a);if(action==null)continue;LinearLayout result=card();title(result,action.optString("title"),17);caption(result,t(action.optString("message")));
        if(action.optString("state").equals("completed")&&!action.optString("paperId").isEmpty())result.addView(button(t(action.optString("artifactId").isEmpty()?"Open paper":"Open result"),true,()->openAgentResult(action)));
        if(action.optBoolean("canUpload"))result.addView(button(t("Upload my PDF"),false,()->recoverPDF("",action.optString("jobId"),action.optString("sharing").equals("shared"))));
        if(!action.optString("jobId").isEmpty())result.addView(button(t("Your requests"),false,()->loadJobs(true)));bubble.addView(result);
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
          api.json("/api/chats/" + id + "/messages", "POST", new JSONObject().put("text",text).put("attachments",new JSONArray(draftAttachments.stream().map(f->f.optString("id")).collect(java.util.stream.Collectors.toList()))).put("language",language()).put("agentActions",true).put("sharing",shareUpload?"shared":"private"));
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
    ReadingReminder.cancel(this);
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
      if(same && saved.optString("owner").equals(d.optString("owner")))d.put("readings",saved.optJSONObject("readings"));
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
    if(!page.equals("reader"))readerReturn=page;
    readLanguage=paper.optString("language").equals("zh-Hans")?"en":"zh-Hans";readingMode="original";alignedReading=null;++readingGeneration;translationPending=false;
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
          refreshReading();
        });
      } catch (Exception e) {
        handler.post(() -> {
          if (epoch != authEpoch || request != readerRequest || !page.equals("reader")) return;
          if (cachedPaper(paper.optString("id")) == null) { returnFromReader(); alert(e.getMessage() == null ? "Could not open this paper." : e.getMessage()); }
        });
      }
    });
  }

  void openAgentResult(JSONObject action){
    String paperID=action.optString("paperId"),artifactID=action.optString("artifactId");
    if(artifactID.isEmpty()){openPaper(object("id",paperID));return;}
    final int epoch=authEpoch;final String conversation=chatId;
    job(()->{JSONObject d=fetchPaper(object("id",paperID)),r=api.json("/api/papers/"+paperID+"/artifacts","GET",null);JSONArray list=r.optJSONArray("artifacts");for(int i=0;list!=null&&i<list.length();i++){JSONObject a=list.optJSONObject(i);if(a.optString("id").equals(artifactID))return new JSONObject().put("document",d).put("artifact",a);}throw new Exception("This saved result is no longer available.");},r->{if(epoch!=authEpoch||!page.equals("agent")||!chatId.equals(conversation))return;readerReturn="agent";document=r.optJSONObject("document");showArtifact(r.optJSONObject("artifact"));});
  }

  void returnFromReader(){
    ++readerRequest;
    if(page.equals("plans"))showProfile();
    else if(page.equals("reader")&&readerReturn.equals("agent"))showAgent();
    else if(page.equals("reader")&&readerReturn.equals("space"))showSpace();
    else showLibrary();
  }

  void showReader() {
    clear("reader");
    header.removeAllViews();
    Button back = button("‹", false, this::returnFromReader);
    back.setContentDescription(t(readerReturn.equals("agent")?"Agent":readerReturn.equals("space")?"Your space":"Back to library"));
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
    if(!derived){readerLanguages=column();content.addView(readerLanguages);updateReaderLanguages();}else readerLanguages=null;
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

  String languageName(String code){String[] codes={"en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};String[] names={"English","简体中文","繁體中文","日本語","한국어","العربية","Español","Français","Deutsch","Русский","Tiếng Việt"};for(int i=0;i<codes.length;i++)if(codes[i].equals(code))return names[i];return code;}
  void updateReaderLanguages(){
    if(readerLanguages==null||document==null||derived)return;
    readerLanguages.removeAllViews();readerLanguages.setPadding(dp(10),dp(2),dp(10),dp(4));
    LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);
    Button language=button(languageName(readLanguage)+" ▾",false,this::languagePicker);language.setTypeface(null,android.graphics.Typeface.BOLD);top.addView(language,new LinearLayout.LayoutParams(0,dp(42),1));
    if(!readingMode.equals("original")&&(alignedReading==null||!alignedReading.optBoolean("complete"))){Button fetch=button(t("Fetch remaining translation"),false,this::requestReading);fetch.setEnabled(!translationPending);fetch.setTextSize(12);top.addView(fetch,new LinearLayout.LayoutParams(0,dp(42),1));}
    readerLanguages.addView(top);
    LinearLayout modes=new LinearLayout(this);String[] ids={"original","translation","interlaced"},names={"Original","Translation","Interlaced"};
    for(int i=0;i<ids.length;i++){final String mode=ids[i];Button b=button(t(names[i]),readingMode.equals(mode),()->{readingMode=mode;updateReaderLanguages();if(reader!=null)reader.evaluateJavascript("window.OnlyIdeasMode&&window.OnlyIdeasMode("+JSONObject.quote(mode)+")",null);});b.setTextSize(13);modes.addView(b,new LinearLayout.LayoutParams(0,dp(42),1));}readerLanguages.addView(modes);
    if(!readingMode.equals("original")){String progress=alignedReading==null?t("Connect to fetch available languages."):alignedReading.optInt("translated")+"/"+alignedReading.optInt("total");readerLanguages.addView(text(t("AI translation")+" · "+progress,12,false));}
  }
  void refreshReading(){
    if(document==null||derived)return;String id=document.optJSONObject("paper").optString("id"),revision=document.optJSONObject("paper").optString("revision"),language=readLanguage;int epoch=authEpoch,generation=++readingGeneration;
    JSONObject cached=document.optJSONObject("readings");JSONObject saved=cached==null?null:cached.optJSONObject(language);if(alignedReading==null&&saved!=null){alignedReading=saved;if(reader!=null)renderDocument(reader);}updateReaderLanguages();
    io.execute(()->{try{JSONObject result=api.json("/api/papers/"+id+"/reading?language="+language,"GET",null);handler.post(()->{
      if(epoch!=authEpoch||generation!=readingGeneration||document==null||!page.equals("reader")||!id.equals(document.optJSONObject("paper").optString("id"))||!revision.equals(result.optString("revision")))return;
      boolean changed=alignedReading==null||!result.optString("mmd").equals(alignedReading.optString("mmd"))||result.optInt("translated")!=alignedReading.optInt("translated");
      alignedReading=result;try{JSONObject readings=document.optJSONObject("readings");if(readings==null)readings=new JSONObject();readings.put(language,result);document.put("readings",readings);saveCached(document);}catch(Exception ignored){}
      updateReaderLanguages();if(changed&&reader!=null)renderDocument(reader);
    });}catch(Exception ignored){}});
  }
  void requestReading(){
    if(account==null){signIn();return;}if(translationPending||document==null)return;
    String id=document.optJSONObject("paper").optString("id"),language=readLanguage;int epoch=authEpoch;
    translationPending=true;updateReaderLanguages();
    io.execute(()->{try{api.json("/api/papers/"+id+"/assist","POST",new JSONObject().put("kind","translation").put("language",language));handler.post(()->{if(epoch!=authEpoch||!page.equals("reader")||document==null||!id.equals(document.optJSONObject("paper").optString("id")))return;translationPending=false;toast(t("Translation requested. Existing work is reused."));refreshReading();pollReading(id,language,epoch,0);});}catch(Exception e){handler.post(()->{if(epoch==authEpoch){translationPending=false;updateReaderLanguages();alert(e.getMessage());}});}});
  }
  void pollReading(String id,String language,int epoch,int attempt){
    handler.postDelayed(()->{if(epoch!=authEpoch||!page.equals("reader")||document==null||!id.equals(document.optJSONObject("paper").optString("id"))||!language.equals(readLanguage)||attempt>=120)return;refreshReading();if(alignedReading==null||!alignedReading.optBoolean("complete"))pollReading(id,language,epoch,attempt+1);},3000);
  }

  String paperAttribution(JSONObject p){JSONObject proof=p.optJSONObject("provenance");return proof==null?"":p.optString("license")+" · "+proof.optString("licenseUrl")+" · "+proof.optString("changes");}
  void renderDocument(WebView view) {
    try {
      JSONObject payload =
          new JSONObject()
              .put("mmd", document.getJSONObject("paper").optString("mmd"))
              .put("figures", document.getJSONObject("figures"))
              .put("attribution",paperAttribution(document.optJSONObject("paper")))
              .put("fontSize", scaledReaderSize()).put("comments",!derived).put("commentLabel",t("Discuss paragraph")).put("language",document.optJSONObject("paper").optString("language","en"))
              .put(
                  "dark",
                  (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                      == Configuration.UI_MODE_NIGHT_YES);
      if(!derived){if(alignedReading==null){JSONObject cached=document.optJSONObject("readings");alignedReading=cached==null?null:cached.optJSONObject(readLanguage);}payload.put("reading",alignedReading).put("mode",readingMode).put("labels",new JSONObject().put("source",languageName(document.optJSONObject("paper").optString("language"))).put("translation",languageName(readLanguage)+" · "+t("AI translation")).put("partial",t("Remaining passages use the original.")));}
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
    if(derived)return;
    String[] codes={"en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};String[] names=new String[codes.length];for(int i=0;i<codes.length;i++)names[i]=languageName(codes[i]);
    new AlertDialog.Builder(this).setTitle(t("Read in another language")).setItems(names,(d,n)->{readLanguage=codes[n];readingMode="interlaced";alignedReading=null;translationPending=false;refreshReading();if(reader!=null)renderDocument(reader);}).setNegativeButton(t("Done"),null).show();
  }

  void showArtifact(JSONObject artifact) {
    if(artifact.optString("kind").equals("translation")){derived=false;readLanguage=artifact.optString("language");readingMode="interlaced";alignedReading=null;showReader();refreshReading();return;}
    try { JSONObject next=new JSONObject(document.toString());JSONObject p=next.getJSONObject("paper");p.put("mmd",artifact.getString("text")).put("revision",artifact.getString("id")).put("language",artifact.getString("language"));document=next;derived=true;showReader(); }
    catch(Exception e){alert(e.getMessage());}
  }

  void pieceTranslation(String paperID) {
    job(()->api.json("/api/papers/"+paperID+"/segments","GET",null),r->{
      JSONArray paragraphs=r.optJSONArray("segments");if(paragraphs==null||paragraphs.length()==0)return;
      LinearLayout c=column();c.setPadding(dp(18),dp(12),dp(18),dp(12));ScrollView scroll=new ScrollView(this);scroll.addView(c);
      caption(c,t("Only missing pieces use the model. Saved translations are reused."));
      String[] codes={"en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};String[] names={"English","简体中文","繁體中文","日本語","한국어","العربية","Español","Français","Deutsch","Русский","Tiếng Việt"};
      Spinner language=new Spinner(this);language.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));language.setSelection(1);language.setContentDescription(t("Language"));c.addView(language);
      ArrayList<String> labels=new ArrayList<>();for(int i=0;i<paragraphs.length();i++){String text=paragraphs.optJSONObject(i).optString("text");labels.add((i+1)+". "+text.substring(0,Math.min(90,text.length())));}
      Spinner paragraph=new Spinner(this);paragraph.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,labels));paragraph.setContentDescription(t("Paragraph"));c.addView(paragraph);
      Spinner sentence=new Spinner(this);sentence.setContentDescription(t("Sentence"));c.addView(sentence);TextView source=text("",16,false);source.setMaxLines(6);source.setEllipsize(android.text.TextUtils.TruncateAt.END);c.addView(source);
      paragraph.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> p){}public void onItemSelected(android.widget.AdapterView<?> p,View v,int n,long id){JSONObject item=paragraphs.optJSONObject(n);JSONArray sentences=item.optJSONArray("sentences");ArrayList<String> names=new ArrayList<>();names.add(t("Entire paragraph"));for(int i=0;i<sentences.length();i++){String s=sentences.optJSONObject(i).optString("text");names.add((i+1)+". "+s.substring(0,Math.min(90,s.length())));}sentence.setAdapter(new ArrayAdapter<>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,names));source.setText(item.optString("text"));}});
      sentence.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> p){}public void onItemSelected(android.widget.AdapterView<?> p,View v,int n,long id){JSONObject item=paragraphs.optJSONObject(paragraph.getSelectedItemPosition());source.setText(n==0?item.optString("text"):item.optJSONArray("sentences").optJSONObject(n-1).optString("text"));}});
      AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Translate a paragraph or sentence")).setView(scroll).setNegativeButton(t("Done"),null).create();
      c.addView(button(t("Translate this passage"),true,()->{if(account==null){signIn();return;}JSONObject p=paragraphs.optJSONObject(paragraph.getSelectedItemPosition());String segment=sentence.getSelectedItemPosition()>0?p.optJSONArray("sentences").optJSONObject(sentence.getSelectedItemPosition()-1).optString("id"):p.optString("id");
        job(()->api.json("/api/papers/"+paperID+"/assist","POST",new JSONObject().put("kind","translation").put("language",codes[language.getSelectedItemPosition()]).put("segmentId",segment)),result->{JSONObject j=result.optJSONObject("job");if(j!=null&&j.optString("state").equals("completed")){job(()->api.json("/api/papers/"+paperID+"/artifacts","GET",null),a->{JSONArray list=a.optJSONArray("artifacts");for(int i=0;i<list.length();i++){JSONObject artifact=list.optJSONObject(i);if(artifact.optString("id").equals(j.optString("artifactId"))){dialog.dismiss();showArtifact(artifact);return;}}});}else loadJobs(true);});}));dialog.show();
    });
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
          c.addView(button(t("Translate a paragraph or sentence"),false,()->pieceTranslation(id)));
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
                    showArtifact(list.optJSONObject(n));
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
                          .setTitle(j.optString("title",t("Your requests")))
                          .setMessage(t(j.optString("message")))
                          .setNeutralButton(j.optBoolean("canUpload")?t("Upload my PDF"):t("Open source"),(x,y)->{if(j.optBoolean("canUpload"))recoverPDF("",j.optString("id"),j.optString("sharing").equals("shared"));else if(j.optString("source").startsWith("https://"))startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(j.optString("source"))));})
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
  protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putString("uploadResearch",uploadResearch);state.putString("uploadRecovery",uploadRecovery);state.putString("uploadOwner",uploadOwner);state.putBoolean("recoveryShared",recoveryShared);}
  void recoverPDF(String research,String recovery,boolean shared){if(account==null){signIn();return;}uploadResearch=research;uploadRecovery=recovery;uploadOwner=account.optString("id");recoveryShared=shared;Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("application/pdf");pick.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(pick,44);}
  @Override
  protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if ((request != 42 && request != 43 && request != 44) || result != RESULT_OK || data == null || data.getData() == null) return;
    if(request==44&&(account==null||!account.optString("id").equals(uploadOwner))){toast(t("Sign in"));return;}
    Uri uri = data.getData();
    String name="";
    try(var cursor=getContentResolver().query(uri,null,null,null,null)){if(cursor!=null&&cursor.moveToFirst()){int col=cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);if(col>=0)name=cursor.getString(col);}}catch(Exception ignored){}
    final boolean shared=request==44?recoveryShared:shareUpload;
    authorizeImport(shared,request!=43||name.toLowerCase(Locale.ROOT).endsWith(".pdf")||"application/pdf".equals(getContentResolver().getType(uri)),0,limit->uploadPicked(uri,request,shared,limit));
  }

  void uploadPicked(Uri uri,int request,boolean shared,int creditLimit) {
    uploadPicked(uri,request,shared,creditLimit,"");
  }
  void uploadPicked(Uri uri,int request,boolean shared,int creditLimit,String confirmation) {
    if(account==null||(request==44&&!account.optString("id").equals(uploadOwner))){alert(t("Sign in to continue."));return;}
    busy = true;
    final String research=uploadResearch,recovery=uploadRecovery;
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
          if(request==44){if(!recovery.isEmpty())headers.put("X-Recovery-Job-Id",recovery);else headers.put("X-Research-Id",research);}
          headers.put("X-Request-Id", UUID.randomUUID().toString());
          headers.put(
              "X-Paper-Title", java.net.URLEncoder.encode(title, "UTF-8").replace("+", "%20"));
          headers.put("X-Paper-Language", "en");
          headers.put("X-Paper-Sharing", shared ? "shared" : "private");
          if(!confirmation.isEmpty())headers.put("X-Paper-Match-Confirm",confirmation);
          try{return api.bytes("/api/import", "POST", out.toByteArray(), "application/pdf", headers);}catch(NativeSession.HttpError e){if(e.details.optString("code").equals("pdf_match_uncertain"))return e.details.toString().getBytes(StandardCharsets.UTF_8);throw e;}
        },
        r -> {
          busy = false;
          try{JSONObject check=new JSONObject(new String(r,StandardCharsets.UTF_8));if(check.optString("code").equals("pdf_match_uncertain")){new AlertDialog.Builder(this).setTitle(t("Check paper match")).setMessage(t(check.optString("error"))+"\n\n"+check.optString("expectedTitle")).setPositiveButton(t("This PDF matches"),(d,w)->uploadPicked(uri,request,shared,creditLimit,check.optString("confirmation"))).setNegativeButton(t("Cancel"),null).show();return;}}catch(Exception ignored){}
          if(request==43){try{JSONObject file=new JSONObject(new String(r,StandardCharsets.UTF_8)).getJSONObject("attachment");if(draftAttachments.stream().noneMatch(a->a.optString("id").equals(file.optString("id"))))draftAttachments.add(file);renderDraftAttachments();toast(t("Attachment added."));}catch(Exception e){alert(e.getMessage());}return;}
          toast(t("PDF queued for conversion."));
          loadJobs(true);
        });
  }
  private final Map<String,String> researchOptions=new LinkedHashMap<>();
  private JSONObject researchTaxonomy=new JSONObject();
  private LinearLayout researchList;
  private TextView researchNotice;
  private Button researchMore;
  private int researchGeneration=0,researchPage=0;
  private boolean researchLoading=false,researchSaved=false,browseResearch=true;
  private String researchQuery="";
  private Runnable researchDebounce;
  private final Set<String> researchIDs=new HashSet<>();
  static String researchMetadata(JSONObject p) {ArrayList<String> values=new ArrayList<>();for(String k:List.of("discipline","subdiscipline","year","journal"))if(!p.optString(k).isEmpty())values.add(p.optString(k));return String.join(" · ",values);}
  static boolean researchMatches(String query,String text) {
    String normalized=java.text.Normalizer.normalize(text.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","");
    String[] words=normalized.split("[^\\p{L}\\p{N}]+");
    for(String q:java.text.Normalizer.normalize(query.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","").split("\\s+")){if(q.isEmpty())continue;boolean found=false;for(String w:words){if(w.contains(q)){found=true;break;}if(q.length()<5||Math.abs(q.length()-w.length())>1)continue;int i=0,j=0,n=0;while(i<q.length()&&j<w.length()){if(q.charAt(i)==w.charAt(j)){i++;j++;}else{n++;if(n>1)break;if(q.length()>=w.length())i++;if(w.length()>=q.length())j++;}}if(n+q.length()-i+w.length()-j<=1){found=true;break;}}if(!found)return false;}return true;
  }
  void researchSetup(LinearLayout c) {
    LinearLayout top=row();TextView label=text(t("Research for you"),20,true);top.addView(label,new LinearLayout.LayoutParams(0,-2,1));top.addView(button(t("Filters"),false,this::researchFilters));top.addView(button(t(researchSaved?"Research for you":"Saved"),false,()->{if(account==null){signIn();return;}researchSaved=!researchSaved;showLibrary();}));c.addView(top);
    caption(c,t("Tap a paper to fetch and convert it. Existing papers open immediately. Shared imports enter publication review."));gap(c,10);
    researchList=column();c.addView(researchList);researchNotice=text("",14,false);researchNotice.setTextColor(muted);c.addView(researchNotice);
    researchMore=button(t("Load more"),false,()->researchLoad(researchPage,researchGeneration));c.addView(researchMore);researchMore.setVisibility(View.GONE);
    if(researchTaxonomy.length()==0)job(()->api.json("/api/discovery/taxonomy","GET",null),r->researchTaxonomy=r,false);
    if(c.getParent() instanceof LinearLayout && ((LinearLayout)c.getParent()).getParent() instanceof ScrollView){ScrollView scroll=(ScrollView)((LinearLayout)c.getParent()).getParent();scroll.setOnScrollChangeListener((View v,int x,int y,int ox,int oy)->{android.graphics.Rect rect=new android.graphics.Rect();if(researchMore.getVisibility()==View.VISIBLE&&researchMore.getGlobalVisibleRect(rect)&&!researchLoading)researchLoad(researchPage,researchGeneration);});}
    researchReset();
  }
  void researchReset(){researchGeneration++;researchLoading=false;researchPage=0;researchIDs.clear();if(researchList==null)return;researchList.removeAllViews();researchNotice.setText("");researchMore.setVisibility(View.GONE);if(researchDebounce!=null)handler.removeCallbacks(researchDebounce);int g=researchGeneration;researchDebounce=()->researchLoad(1,g);handler.postDelayed(researchDebounce,researchQuery.isEmpty()?0:450);}
  void researchLoad(int p,int g){if(p<1||g!=researchGeneration||researchLoading||!page.equals("library"))return;researchLoading=true;researchNotice.setText(t("Finding research…"));researchMore.setEnabled(false);int epoch=authEpoch;Map<String,String> params=new LinkedHashMap<>(researchOptions);params.put("q",researchQuery);params.put("page",String.valueOf(p));boolean saved=researchSaved;
    io.execute(()->{try{android.net.Uri.Builder uri=new android.net.Uri.Builder().path(saved?"/api/saved":"/api/discovery");for(Map.Entry<String,String> e:params.entrySet())uri.appendQueryParameter(e.getKey(),e.getValue());JSONObject result=api.json(uri.build().toString(),"GET",null);handler.post(()->{if(g!=researchGeneration||epoch!=authEpoch||!page.equals("library"))return;researchLoading=false;researchNotice.setText(result.optBoolean("stale")?t("Showing cached research results."):result.optJSONArray("unavailable")!=null&&result.optJSONArray("unavailable").length()>0?t("Some research indexes are temporarily unavailable."):"");JSONArray hits=result.optJSONArray("papers");if(hits!=null)for(int i=0;i<hits.length();i++){JSONObject hit=hits.optJSONObject(i);if(hit!=null&&researchIDs.add(hit.optString("id")))researchCard(hit);}researchPage=result.optInt("nextPage",0);researchMore.setEnabled(true);researchMore.setVisibility(researchPage>0?View.VISIBLE:View.GONE);if(researchIDs.isEmpty()&&researchNotice.getText().length()==0)researchNotice.setText(t("No papers found. Try broader keywords or fewer filters."));});}catch(Exception error){handler.post(()->{if(g!=researchGeneration||epoch!=authEpoch||!page.equals("library"))return;researchLoading=false;researchNotice.setText(error.getMessage());researchPage=p;researchMore.setText(t("Try again"));researchMore.setEnabled(true);researchMore.setVisibility(View.VISIBLE);});}});
  }
  void researchCard(JSONObject p){LinearLayout card=card();caption(card,researchMetadata(p));TextView heading=text(p.optString("title"),18,true);heading.setPadding(0,dp(8),0,dp(8));heading.setOnClickListener(v->researchChoose(p));card.addView(heading);caption(card,p.optString("authors"));if(!p.optString("summary").isEmpty()){TextView summary=text(p.optString("summary"),15,false);summary.setMaxLines(3);summary.setEllipsize(android.text.TextUtils.TruncateAt.END);card.addView(summary);}if(!p.optString("doi").isEmpty())caption(card,"DOI "+p.optString("doi"));LinearLayout actions=row();actions.addView(button(t(p.has("paperId")?"Open paper":"Fetch & read"),false,()->researchChoose(p)),new LinearLayout.LayoutParams(0,-2,1));actions.addView(button(t("Source"),false,()->{String source=p.optString("source");if(source.startsWith("https://"))startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(source)));}));card.addView(actions);if(!p.has("paperId"))card.addView(button(t("Upload my PDF"),false,()->recoverPDF(p.optString("id"),"",true)));socialActions(card,p.optString("ref","r-"+p.optString("id")),p.optString("title"));addCard(researchList,card);}
  void researchChoose(JSONObject p){String id=p.optString("paperId");if(id.isEmpty()&&p.has("ref")&&!p.optString("ref").startsWith("r-"))id=p.optString("ref");if(!id.isEmpty()){try{openPaper(new JSONObject().put("id",id).put("title",p.optString("title")));}catch(Exception ignored){}return;}if(account==null){signIn();return;}job(()->api.json("/api/discovery/import","POST",new JSONObject().put("id",p.optString("id")).put("sharing","shared")),r->{if(!r.optString("paperId").isEmpty()){try{openPaper(new JSONObject().put("id",r.optString("paperId")).put("title",p.optString("title")));}catch(Exception ignored){}}else loadJobs(true);});}
  void researchFilters(){LinearLayout c=column();c.setPadding(dp(20),dp(8),dp(20),dp(8));ScrollView scroll=new ScrollView(this);scroll.addView(c);Map<String,String> draft=new LinkedHashMap<>(researchOptions);String[] providers={"all","openalex","arxiv"};Spinner source=new Spinner(this);source.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{t("All research"),"OpenAlex","arXiv"}));caption(c,t("Source"));c.addView(source);LinearLayout category=column();c.addView(category);Runnable categories=()->{category.removeAllViews();JSONArray tree=researchTaxonomy.optJSONArray(draft.getOrDefault("source","all").equals("arxiv")?"arxiv":"openalex");if(tree==null)return;ArrayList<String> names=new ArrayList<>(List.of(t("All disciplines"))),ids=new ArrayList<>(List.of(""));for(int i=0;i<tree.length();i++){JSONObject f=tree.optJSONObject(i);names.add(f.optString("name"));ids.add(f.optString("id"));}Spinner first=new Spinner(this),second=new Spinner(this);caption(category,t("Primary discipline"));category.addView(first);caption(category,t("Secondary discipline"));category.addView(second);first.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));first.setSelection(Math.max(0,ids.indexOf(draft.getOrDefault("discipline",""))));first.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> v){}public void onItemSelected(AdapterView<?> v,View view,int pos,long id){String prev=draft.getOrDefault("discipline","");draft.put("discipline",ids.get(pos));if(!prev.equals(ids.get(pos)))draft.put("subdiscipline","");JSONArray children=pos>0?tree.optJSONObject(pos-1).optJSONArray("children"):new JSONArray();ArrayList<String> subNames=new ArrayList<>(List.of(t("All disciplines"))),subIDs=new ArrayList<>(List.of(""));if(children!=null)for(int j=0;j<children.length();j++){subNames.add(children.optJSONObject(j).optString("name"));subIDs.add(children.optJSONObject(j).optString("id"));}second.setAdapter(new ArrayAdapter<>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,subNames));second.setSelection(Math.max(0,subIDs.indexOf(draft.getOrDefault("subdiscipline",""))));second.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> v){}public void onItemSelected(AdapterView<?> v,View view,int n,long id){draft.put("subdiscipline",subIDs.get(n));}});}});};source.setSelection(Math.max(0,Arrays.asList(providers).indexOf(draft.getOrDefault("source","all"))));source.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> v){}public void onItemSelected(AdapterView<?> v,View view,int pos,long id){if(!draft.getOrDefault("source","all").equals(providers[pos])){draft.remove("discipline");draft.remove("subdiscipline");}draft.put("source",providers[pos]);categories.run();}});
    Map<String,EditText> inputs=new LinkedHashMap<>();for(String key:List.of("from","to","journal")){caption(c,t(key.equals("from")?"From year":key.equals("to")?"To year":"Journal"));EditText edit=new EditText(this);edit.setSingleLine(true);edit.setText(draft.getOrDefault(key,""));if(!key.equals("journal"))edit.setInputType(InputType.TYPE_CLASS_NUMBER);c.addView(edit);inputs.put(key,edit);}Spinner order=new Spinner(this);order.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{t("Relevance"),t("Newest first")}));order.setSelection("latest".equals(draft.get("sort"))?1:0);caption(c,t("Sort"));c.addView(order);
    new AlertDialog.Builder(this).setTitle(t("Filters")).setView(scroll).setPositiveButton(t("Apply"),(d,w)->{researchOptions.clear();researchOptions.putAll(draft);for(String key:inputs.keySet())researchOptions.put(key,inputs.get(key).getText().toString());researchOptions.put("sort",order.getSelectedItemPosition()==1?"latest":"relevance");researchReset();}).setNeutralButton(t("Clear filters"),(d,w)->{researchOptions.clear();researchReset();}).setNegativeButton(t("Cancel"),null).show();
  }
  void socialActions(LinearLayout parent,String ref,String title){LinearLayout row=row();parent.addView(row);JSONObject[] state={new JSONObject()};Runnable[] render=new Runnable[1];render[0]=()->{row.removeAllViews();for(String action:List.of("saved","liked","comments","share")){String label=action.equals("saved")?(state[0].optBoolean("saved")?"★ "+t("Saved"):"☆ "+t("Save")):action.equals("liked")?(state[0].optBoolean("liked")?"♥ ":"♡ ")+t("Like"):t(action.equals("comments")?"Comment":"Share");Button b=button(label,false,()->{if(action.equals("comments")){itemDiscussion(ref,title,state[0].optBoolean("private"));return;}if(action.equals("share")){String url=state[0].optString("shareUrl");if(url.isEmpty()||url.equals("null")){toast(t("Private papers can only be opened by their owner."));return;}Intent send=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,title+"\n"+url);startActivity(Intent.createChooser(send,t("Share")));return;}if(account==null){signIn();return;}job(()->api.json("/api/items/"+ref,"PUT",new JSONObject().put(action,!state[0].optBoolean(action))),r->{state[0]=r;render[0].run();});});b.setTextSize(11);b.setPadding(0,0,0,0);row.addView(b,new LinearLayout.LayoutParams(0,dp(44),1));}};render[0].run();job(()->api.json("/api/items/"+ref,"GET",null),r->{state[0]=r;render[0].run();},false);}
  void itemDiscussion(String ref,String paperTitle,boolean privatePaper){LinearLayout c=column();c.setPadding(dp(18),dp(8),dp(18),dp(16));c.setFocusableInTouchMode(true);caption(c,paperTitle);LinearLayout thread=column();c.addView(thread);CheckBox terms=new CheckBox(this);terms.setText(t("I accept the Community Terms"));if(!privatePaper){c.addView(terms);c.addView(button(t("Read Community Terms"),false,()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lachlan.lazying.art/OnlyIdeasApp/terms.html")))));}EditText draft=new EditText(this);draft.setHint(t("Your comment"));draft.setMinLines(3);draft.setGravity(Gravity.TOP);draft.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE);c.addView(draft);ScrollView scroll=new ScrollView(this);scroll.addView(c);AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Paper discussion")).setView(scroll).setNegativeButton(t("Done"),null).create();Runnable[] load=new Runnable[1];load[0]=()->job(()->api.json("/api/items/"+ref+"/comments","GET",null),r->{thread.removeAllViews();JSONArray comments=r.optJSONArray("comments");if(comments!=null)for(int i=0;i<comments.length();i++){JSONObject comment=comments.optJSONObject(i);title(thread,comment.optString("author"),15);caption(thread,comment.optString("text"));if(comment.optBoolean("pending"))caption(thread,t("Waiting for community review"));if(comment.optBoolean("canDelete"))thread.addView(button(t("Delete"),false,()->job(()->api.json("/api/comments/"+comment.optString("id"),"DELETE",null),v->load[0].run())));else{thread.addView(button(t("Report"),false,()->{if(account==null){signIn();return;}EditText reason=new EditText(this);new AlertDialog.Builder(this).setTitle(t("What should we review?")).setView(reason).setPositiveButton(t("Send report"),(d,w)->job(()->api.json("/api/comments/"+comment.optString("id")+"/report","POST",new JSONObject().put("reason",reason.getText().toString())),v->toast(t("Report sent.")))).show();}));thread.addView(button(t("Block reader"),false,()->{if(account==null){signIn();return;}job(()->api.json("/api/comments/"+comment.optString("id")+"/block","POST",new JSONObject()),v->load[0].run());}));}}scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));});c.addView(button(t("Post thought"),true,()->{if(account==null){signIn();return;}if(!privatePaper&&!terms.isChecked()){toast(t("I accept the Community Terms"));return;}job(()->api.json("/api/items/"+ref+"/comments","POST",new JSONObject().put("id",UUID.randomUUID().toString()).put("text",draft.getText().toString()).put("acceptTerms",terms.isChecked())),r->{draft.setText("");load[0].run();});}));dialog.setOnShowListener(v->{c.requestFocus();dialog.getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);load[0].run();});dialog.show();}

  private String spaceTab="saved";
  private int spaceGeneration=0;
  void showSpace(){
    clear("space");int generation=++spaceGeneration;int epoch=authEpoch;LinearLayout c=scrollContent();title(c,t("Your space"),25);
    if(account==null){c.addView(button(t("Sign in"),true,this::signIn));return;}
    c.addView(button(t("Interests & notifications"),false,this::showReadingPreferences));
    android.widget.HorizontalScrollView strip=new android.widget.HorizontalScrollView(this);strip.setHorizontalScrollBarEnabled(false);LinearLayout tabs=row();strip.addView(tabs);c.addView(strip);
    String[] ids={"saved","liked","inbox","activity","daily"},names={"Saved","Liked","Inbox","Activity","For you"};
    for(int i=0;i<ids.length;i++){String id=ids[i];tabs.addView(button(t(names[i]),spaceTab.equals(id),()->{spaceTab=id;showSpace();}));}
    LinearLayout results=column();c.addView(results);caption(results,t("Loading…"));
    job(()->api.json("/api/"+spaceTab,"GET",null),r->{if(!page.equals("space")||generation!=spaceGeneration||epoch!=authEpoch)return;results.removeAllViews();
      JSONArray list=r.optJSONArray("papers"),events=r.optJSONArray("events");if(events==null)events=r.optJSONArray("notifications");
      if(list!=null)for(int i=0;i<list.length();i++){JSONObject p=list.optJSONObject(i);if(p==null)continue;LinearLayout card=card();title(card,p.optString("title"),18);caption(card,researchMetadata(p));caption(card,p.optString("authors"));card.addView(button(t(!p.optString("paperId").isEmpty()||(p.has("ref")&&!p.optString("ref").startsWith("r-"))?"Open paper":"Fetch & read"),false,()->researchChoose(p)));if(!p.has("paperId")&&p.optString("ref","r-").startsWith("r-"))card.addView(button(t("Upload my PDF"),false,()->recoverPDF(p.optString("id"),"",true)));socialActions(card,p.optString("ref","r-"+p.optString("id")),p.optString("title"));results.addView(card);}
      if(events!=null){JSONArray entries=events;if(spaceTab.equals("inbox")&&r.optInt("unread")>0)results.addView(button(t("Mark all read"),false,()->job(()->{JSONArray idsRead=new JSONArray();for(int i=0;i<entries.length();i++)idsRead.put(entries.getJSONObject(i).getString("id"));return api.json("/api/inbox","PUT",new JSONObject().put("ids",idsRead));},v->showSpace())));
        for(int i=0;i<events.length();i++){JSONObject e=events.optJSONObject(i);if(e==null)continue;LinearLayout card=card();String kind=e.optString("kind");String label=kind.equals("comment")?"New comment":kind.equals("like")?"New like":kind.equals("fetch")?"Paper request":kind.equals("saved")?(e.optBoolean("active")?"Saved":"Removed from Saved"):(e.optBoolean("active")?"Liked":"Removed from Liked");caption(card,(e.has("read")&&!e.optBoolean("read")?"● ":"")+t(label)+" · "+java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.SHORT,java.text.DateFormat.SHORT).format(new java.util.Date(e.optLong("created"))));title(card,e.optString("title"),17);if(e.has("actor"))caption(card,e.optString("actor"));if(e.has("message"))caption(card,t(e.optString("message")));String ref=e.optString("ref");
          if(!ref.isEmpty())card.addView(button(t("Open paper"),false,()->{if(e.has("read")&&!e.optBoolean("read"))job(()->api.json("/api/inbox","PUT",new JSONObject().put("ids",new JSONArray().put(e.optString("id")))),v->{});if(ref.startsWith("r-"))job(()->api.json("/api/discovery/item/"+ref.substring(2),"GET",null),v->{JSONObject p=v.optJSONObject("paper");if(p!=null)new AlertDialog.Builder(this).setTitle(p.optString("title")).setMessage(researchMetadata(p)).setPositiveButton(t("Fetch & read"),(d,w)->researchChoose(p)).setNeutralButton(t("Comment"),(d,w)->itemDiscussion(ref,p.optString("title"),false)).setNegativeButton(t("Done"),null).show();});else openPaper(object("id",ref));}));
          if(kind.equals("fetch")&&e.optString("paperId").isEmpty())card.addView(button(t("Your requests"),false,()->loadJobs(true)));results.addView(card);
        }
      }
      if((list==null||list.length()==0)&&(events==null||events.length()==0))caption(results,t(spaceTab.equals("inbox")?"No new notifications":spaceTab.equals("activity")?"Your reading activity will appear here.":"No papers here yet."));
    });
  }
  void showReadingPreferences(){
    if(account==null){signIn();return;}job(()->{JSONObject r=api.json("/api/preferences","GET",null);r.put("taxonomy",api.json("/api/discovery/taxonomy","GET",null));return r;},r->{
      JSONObject prefs=r.optJSONObject("preferences");if(prefs==null)return;LinearLayout c=column();c.setPadding(dp(18),dp(12),dp(18),dp(12));
      caption(c,t("Topics you enjoy"));EditText interests=new EditText(this);interests.setText(prefs.optString("interests"));interests.setHint(t("For example: quantum physics"));interests.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(120)});c.addView(interests);
      JSONArray fields=r.optJSONObject("taxonomy").optJSONArray("openalex");ArrayList<String> names=new ArrayList<>(),ids=new ArrayList<>();names.add(t("All disciplines"));ids.add("");if(fields!=null)for(int i=0;i<fields.length();i++){names.add(fields.optJSONObject(i).optString("name"));ids.add(fields.optJSONObject(i).optString("id"));}
      caption(c,t("Primary discipline"));Spinner field=new Spinner(this);field.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));field.setSelection(Math.max(0,ids.indexOf(prefs.optString("discipline"))));c.addView(field);
      String[] langCodes={"en","zh-Hans","zh-Hant","ja","ko","ar","es","fr","de","ru","vi"};String[] langNames={"English","简体中文","繁體中文","日本語","한국어","العربية","Español","Français","Deutsch","Русский","Tiếng Việt"};caption(c,t("Preferred reading language"));Spinner lang=new Spinner(this);lang.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,langNames));lang.setSelection(Math.max(0,java.util.Arrays.asList(langCodes).indexOf(prefs.optString("language"))));c.addView(lang);
      android.widget.CheckBox daily=new android.widget.CheckBox(this),comments=new android.widget.CheckBox(this),likes=new android.widget.CheckBox(this);daily.setText(t("Daily reading reminder"));daily.setChecked(prefs.optBoolean("dailyEnabled"));comments.setText(t("Comment notifications"));comments.setChecked(prefs.optBoolean("commentAlerts",true));likes.setText(t("Like notifications"));likes.setChecked(prefs.optBoolean("likeAlerts",true));c.addView(comments);c.addView(likes);caption(c,t("Activity appears in your inbox when you open the app."));c.addView(daily);
      String[] at=prefs.optString("dailyTime","09:00").split(":");int[] time={Integer.parseInt(at[0]),Integer.parseInt(at[1])};Button choose=button(t("Daily time")+" · "+prefs.optString("dailyTime"),false,()->{});choose.setOnClickListener(v->new android.app.TimePickerDialog(this,(view,h,m)->{time[0]=h;time[1]=m;choose.setText(t("Daily time")+" · "+String.format(Locale.ROOT,"%02d:%02d",h,m));},time[0],time[1],true).show());c.addView(choose);caption(c,java.util.TimeZone.getDefault().getID());caption(c,t("Open For you for papers matching your interests. Reminders do not download or convert papers."));
      ScrollView scroll=new ScrollView(this);scroll.addView(c);AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Interests & notifications")).setView(scroll).setNegativeButton(t("Cancel"),null).create();
      c.addView(button(t("Save preferences"),true,()->job(()->api.json("/api/preferences","PUT",new JSONObject().put("interests",interests.getText().toString()).put("discipline",ids.get(field.getSelectedItemPosition())).put("language",langCodes[lang.getSelectedItemPosition()]).put("dailyEnabled",daily.isChecked()).put("dailyTime",String.format(Locale.ROOT,"%02d:%02d",time[0],time[1])).put("timezone",java.util.TimeZone.getDefault().getID()).put("commentAlerts",comments.isChecked()).put("likeAlerts",likes.isChecked())),v->{
        ReadingReminder.configure(this,daily.isChecked(),time[0],time[1],t("Your daily reading time"),t("Open For you to explore research matching your interests."));if(daily.isChecked()&&android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},91);toast(t("Preferences saved"));dialog.dismiss();if(page.equals("space"))showSpace();})));dialog.show();
    });
  }

}
