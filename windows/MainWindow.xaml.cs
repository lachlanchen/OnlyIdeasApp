using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
namespace OnlyIdeas.Windows;
public partial class MainWindow : Window {
 CancellationTokenSource? login;
 bool closed;
 readonly bool selfTest=Environment.GetCommandLineArgs().Contains("--self-test");
 readonly string qaID=Guid.NewGuid().ToString("N");
 bool selfTestStarted;
 readonly HttpClient http=new(new HttpClientHandler {AllowAutoRedirect=false,UseCookies=false}) {Timeout=TimeSpan.FromSeconds(30)};
 public MainWindow(){InitializeComponent();if(selfTest){ShowActivated=false;ShowInTaskbar=false;Opacity=0;Left=-16000;Top=-16000;}Loaded+=Initialize;Closed+=(_,_)=>{closed=true;login?.Cancel();Reader.Dispose();http.Dispose();};PreviewKeyDown+=Keys;}
 async void Initialize(object sender,RoutedEventArgs e){
  try {
   var profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"LazyingArt","OnlyIdeas",selfTest?"QA/"+qaID:"WebView2");
   var environment=await CoreWebView2Environment.CreateAsync(null,profile);
   if(closed)return;
   await Reader.EnsureCoreWebView2Async(environment);
   var core=Reader.CoreWebView2;
   core.Settings.AreHostObjectsAllowed=false;core.Settings.IsWebMessageEnabled=false;core.Settings.AreDevToolsEnabled=false;
   core.Settings.IsPasswordAutosaveEnabled=false;core.Settings.IsGeneralAutofillEnabled=false;
   core.NavigationStarting+=(_,a)=>{
    if(!Uri.TryCreate(a.Uri,UriKind.Absolute,out var uri)){a.Cancel=true;return;}
    if(DesktopPolicy.AuthStart(uri)){a.Cancel=true;_ = SignInAsync();return;}
    if(!DesktopPolicy.Owned(uri)){a.Cancel=true;if(a.IsUserInitiated)OpenExternal(uri);}
   };
   core.FrameNavigationStarting+=(_,a)=>{if(!Uri.TryCreate(a.Uri,UriKind.Absolute,out var uri)||!DesktopPolicy.Owned(uri))a.Cancel=true;};
   core.NewWindowRequested+=(_,a)=>{a.Handled=true;if(a.IsUserInitiated&&Uri.TryCreate(a.Uri,UriKind.Absolute,out var uri))OpenExternal(uri);};
   core.PermissionRequested+=(_,a)=>a.State=CoreWebView2PermissionState.Deny;
   core.ServerCertificateErrorDetected+=(_,a)=>a.Action=CoreWebView2ServerCertificateErrorAction.Cancel;
   core.AddWebResourceRequestedFilter(DesktopPolicy.Origin+"/api/*",CoreWebView2WebResourceContext.All);
   core.WebResourceRequested+=(_,a)=>{if(Uri.TryCreate(a.Request.Uri,UriKind.Absolute,out var uri)&&DesktopPolicy.Owned(uri)&&uri.AbsolutePath.Contains("logout",StringComparison.Ordinal))login?.Cancel();};
   core.ProcessFailed+=(_,_)=>Status.Text="The reading window stopped. Choose Refresh to reopen it.";
   core.NavigationCompleted+=async(_,a)=>{if(!a.IsSuccess)Status.Text="Could not connect. Check your connection, then choose Refresh.";else if(login is null)Status.Text="";if(selfTest&&!selfTestStarted){selfTestStarted=true;await QualifyWindowsAsync(a.IsSuccess);}};
   var paperArgument=Environment.GetCommandLineArgs().FirstOrDefault(a=>a.StartsWith("--self-test-paper=",StringComparison.Ordinal));
   var paperID=paperArgument?.Split('=',2)[1];
   if(selfTest&&paperID is not null&&!System.Text.RegularExpressions.Regex.IsMatch(paperID,@"^[A-Za-z0-9-]{1,120}$"))throw new InvalidOperationException("Invalid test paper.");
   core.Navigate(DesktopPolicy.Origin+(selfTest&&paperID is not null?"/?paper="+Uri.EscapeDataString(paperID):""));
  }catch(WebView2RuntimeNotFoundException){if(selfTest){FinishSelfTest(new[]{"WebView2 runtime unavailable"},false);return;}Status.Text="Install Microsoft Edge WebView2 Runtime, then reopen OnlyIdeas.";if(MessageBox.Show(this,"OnlyIdeas needs Microsoft Edge WebView2 Runtime. Open Microsoft’s download page?","OnlyIdeas",MessageBoxButton.YesNo)==MessageBoxResult.Yes)OpenExternal(new Uri("https://developer.microsoft.com/microsoft-edge/webview2/"));}
   catch(Exception error){if(selfTest){FinishSelfTest(new[]{"Window initialization: "+error.GetType().Name+" (0x"+error.HResult.ToString("X8")+"): "+error.Message},false);return;}Status.Text="OnlyIdeas could not open its reading window. Close and reopen the app.";}
 }
 async Task QualifyWindowsAsync(bool navigationOK){
  var checks=new List<string>();
  try {
   if(!navigationOK)throw new InvalidOperationException("Navigation failed");
   checks.Add("WPF and WebView2 initialized; verified HTTPS navigation completed");
   for(int n=0;n<100;n++){if(await Reader.CoreWebView2.ExecuteScriptAsync("!!document.querySelector('.reader-tools')")=="true")break;await Task.Delay(200);}
   if(await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelectorAll('.reader-tools>button').length")!="4")throw new InvalidOperationException("Reader toolbar not loaded");
   checks.Add("Actual deployed reader and all four tools loaded");
   await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelectorAll('.reader-tools>button')[0].click()");
   if(await Reader.CoreWebView2.ExecuteScriptAsync("!!document.querySelector('.reader-dialog nav')")!="true")throw new InvalidOperationException("Contents did not open");
   await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelector('.reader-dialog header button').click();document.querySelectorAll('.reader-tools>button')[1].click();const q=document.querySelector('.reader-search input');q.value=(document.querySelector('.paper-section p')?.textContent.match(/[A-Za-z]{4,}/)||['the'])[0];q.dispatchEvent(new Event('input'))");
   if(!int.TryParse(await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelectorAll('mark.reader-match').length"),out var matches)||matches<1)throw new InvalidOperationException("Paper search returned no marks");
   checks.Add("Contents and in-paper search work in WebView2");
   await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelector('.reader-search button:last-child').click();document.querySelector('.paper-content img').click()");
   if(await Reader.CoreWebView2.ExecuteScriptAsync("!!document.querySelector('.reader-image-viewport img')")!="true")throw new InvalidOperationException("Figure did not open");
   checks.Add("Figure enlargement opened");
   await Reader.CoreWebView2.ExecuteScriptAsync("document.querySelector('.reader-dialog header button').click();document.querySelector('.reader-tools').scrollIntoView()");
   if(await Reader.CoreWebView2.ExecuteScriptAsync("document.documentElement.scrollWidth<=innerWidth+1")!="true")throw new InvalidOperationException("Horizontal page overflow");
   var cookies=await Reader.CoreWebView2.CookieManager.GetCookiesAsync(DesktopPolicy.Origin);
   if(cookies.Any(c=>c.Name=="__Host-onlyideas"))throw new InvalidOperationException("Test profile unexpectedly authenticated");
   checks.Add("Isolated anonymous profile; no account or billing action");
   var path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"LazyingArt","OnlyIdeas");Directory.CreateDirectory(path);
   await using(var file=File.Create(Path.Combine(path,"windows-self-test.png")))await Reader.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,file);
   FinishSelfTest(checks,true);
  }catch(Exception e){checks.Add(e.Message);FinishSelfTest(checks,false);}
 }
 void FinishSelfTest(IEnumerable<string> checks,bool passed){
  var path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"LazyingArt","OnlyIdeas");Directory.CreateDirectory(path);
  File.WriteAllText(Path.Combine(path,"windows-self-test.json"),JsonSerializer.Serialize(new {passed,checks,qaID,processId=Environment.ProcessId,at=DateTimeOffset.UtcNow,nonactivating=true,authenticated=false},new JsonSerializerOptions{WriteIndented=true}));
  Environment.ExitCode=passed?0:1;Close();
 }
 static void OpenExternal(Uri uri){if(DesktopPolicy.External(uri))try{Process.Start(new ProcessStartInfo(uri.AbsoluteUri){UseShellExecute=true});}catch(System.ComponentModel.Win32Exception){} }
 async Task<JsonElement> Auth(string path,object body,CancellationToken token){
  using var request=new HttpRequestMessage(HttpMethod.Post,DesktopPolicy.Origin+"/api/auth/native/"+path){Content=JsonContent.Create(body)};
  request.Headers.Add("Origin","capacitor://localhost");request.Headers.Add("X-OnlyIdeas-Client","native");
  using var response=await http.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,token);
  if(!response.IsSuccessStatusCode)throw new InvalidOperationException("Sign-in could not finish. Please try again.");
  await using var stream=await response.Content.ReadAsStreamAsync(token);using var limited=new MemoryStream();var buffer=new byte[4096];int size;
  while((size=await stream.ReadAsync(buffer,token))>0){if(limited.Length+size>65536)throw new InvalidOperationException("Unexpected sign-in response.");limited.Write(buffer,0,size);}
  using var json=JsonDocument.Parse(limited.ToArray());return json.RootElement.Clone();
 }
 async Task SignInAsync(){
  if(login is not null||Reader.CoreWebView2 is null)return;
  using var attempt=new CancellationTokenSource(TimeSpan.FromMinutes(10));login=attempt;SignInButton.IsEnabled=false;CancelButton.Visibility=Visibility.Visible;
  try{
   var verifier=DesktopPolicy.Proof(RandomNumberGenerator.GetBytes(32));var challenge=DesktopPolicy.Proof(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
   var start=await Auth("start",new{challenge},attempt.Token);var flow=start.GetProperty("flow").GetString()!;
   if(flow.Length!=43||!Uri.TryCreate(start.GetProperty("url").GetString(),UriKind.Absolute,out var uri)||!DesktopPolicy.AuthFlow(uri,flow))throw new InvalidOperationException("Unexpected sign-in address.");
   OpenExternal(uri);Status.Text="Finish sign-in in your browser. You can cancel here.";
   while(true){await Task.Delay(TimeSpan.FromSeconds(2),attempt.Token);var result=await Auth("complete",new{flow,verifier},attempt.Token);
    if(result.TryGetProperty("pending",out var pending)&&pending.GetBoolean())continue;
    attempt.Token.ThrowIfCancellationRequested();if(closed)return;
    var token=result.GetProperty("token").GetString()!;
    if(token.Length!=72||!Guid.TryParse(token[..36],out _)||!Guid.TryParse(token[36..],out _))throw new InvalidOperationException("Unexpected session response.");
    var cookies=Reader.CoreWebView2.CookieManager;var cookie=cookies.CreateCookie("__Host-onlyideas",token,"agent.onlyideas.art","/");cookie.IsHttpOnly=true;cookie.IsSecure=true;cookie.SameSite=CoreWebView2CookieSameSiteKind.Lax;cookie.Expires=DateTime.UtcNow.AddDays(90);cookies.AddOrUpdateCookie(cookie);
    Reader.CoreWebView2.Navigate(DesktopPolicy.Origin);Status.Text="Signed in.";break;
   }
  }catch(OperationCanceledException){if(!closed)Status.Text="Sign-in canceled or expired. Your reading data is unchanged.";}
   catch(Exception){if(!closed)Status.Text="Sign-in could not finish. Choose Sign in to try again.";}
  finally{if(ReferenceEquals(login,attempt))login=null;if(!closed){SignInButton.IsEnabled=true;CancelButton.Visibility=Visibility.Collapsed;}}
 }
 void Back_Click(object sender,RoutedEventArgs e){if(Reader.CoreWebView2?.CanGoBack==true)Reader.CoreWebView2.GoBack();}
 void Home_Click(object sender,RoutedEventArgs e)=>Reader.CoreWebView2?.Navigate(DesktopPolicy.Origin);
 void Refresh_Click(object sender,RoutedEventArgs e)=>Reader.CoreWebView2?.Reload();
 async void SignIn_Click(object sender,RoutedEventArgs e)=>await SignInAsync();
 void Cancel_Click(object sender,RoutedEventArgs e)=>login?.Cancel();
 void Keys(object sender,KeyEventArgs e){if(e.Key==Key.F5){Reader.CoreWebView2?.Reload();e.Handled=true;}if(e.SystemKey==Key.Left&&Keyboard.Modifiers==ModifierKeys.Alt){Back_Click(sender,new RoutedEventArgs());e.Handled=true;}}
}
