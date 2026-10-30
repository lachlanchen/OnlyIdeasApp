using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Windows;
namespace OnlyIdeas.Windows;
public partial class MainWindow {
 readonly HttpClient updateHttp=new(new HttpClientHandler{AllowAutoRedirect=false,UseCookies=false}){Timeout=TimeSpan.FromSeconds(12),MaxResponseContentBufferSize=65536};
 readonly CancellationTokenSource updateLifetime=new();
 DateTimeOffset updateCheckedAt=DateTimeOffset.MinValue;
 bool updateChecking;
 string? offeredUpdate,offeredKey;
 string UpdateStatePath=>Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"LazyingArt","OnlyIdeas","update-snooze.json");
 void SetupUpdates(){Loaded+=async(_,_)=>await CheckAppUpdates(false);Activated+=async(_,_)=>await CheckAppUpdates(false);Closed+=(_,_)=>{updateLifetime.Cancel();updateHttp.Dispose();};}
 async void CheckUpdates_Click(object sender,RoutedEventArgs e)=>await CheckAppUpdates(true);
 async Task CheckAppUpdates(bool manual){
  if(closed||updateChecking||(!manual&&DateTimeOffset.UtcNow-updateCheckedAt<TimeSpan.FromHours(6)))return;
  updateChecking=true;CheckUpdatesButton.IsEnabled=false;
  try {
   var bytes=await updateHttp.GetByteArrayAsync("https://agent.onlyideas.art/updates.json",updateLifetime.Token);using var document=JsonDocument.Parse(bytes);var root=document.RootElement;
   if(root.GetProperty("schema").GetInt32()!=1)throw new FormatException();var release=root.GetProperty("windows");
   offeredUpdate=null;offeredKey=null;
   if(release.ValueKind!=JsonValueKind.Null){var v=release.GetProperty("version").GetString()??throw new FormatException();var b=release.GetProperty("build").GetString()??throw new FormatException();var installed=Assembly.GetExecutingAssembly().GetName().Version??throw new FormatException();var installedVersion=$"{installed.Major}.{installed.Minor}.{installed.Build}";if(AppUpdatePolicy.Newer(v,b,installedVersion,Math.Max(0,installed.Revision).ToString())){offeredUpdate=v;offeredKey="windows:"+v+":"+b;}}
   updateCheckedAt=DateTimeOffset.UtcNow;
   if(closed)return;
   if(offeredUpdate!=null){UpdateText.Text="Update available · "+offeredUpdate;UpdateBanner.Visibility=manual||!UpdateSnoozed()?Visibility.Visible:Visibility.Collapsed;}
   else {UpdateBanner.Visibility=Visibility.Collapsed;if(manual)MessageBox.Show(this,"You’re up to date.","App updates",MessageBoxButton.OK,MessageBoxImage.Information);}
  }catch(OperationCanceledException)when(closed){}
   catch(Exception error)when(error is HttpRequestException or TaskCanceledException or JsonException or FormatException or InvalidOperationException or KeyNotFoundException){updateCheckedAt=DateTimeOffset.UtcNow-TimeSpan.FromHours(6)+TimeSpan.FromMinutes(15);if(manual&&!closed)MessageBox.Show(this,"Could not check for updates. Try again when online.","App updates",MessageBoxButton.OK,MessageBoxImage.Information);}
  finally{updateChecking=false;if(!closed)CheckUpdatesButton.IsEnabled=true;}
 }
 bool UpdateSnoozed(){try{using var json=JsonDocument.Parse(File.ReadAllText(UpdateStatePath));return AppUpdatePolicy.Snoozed(offeredKey!,json.RootElement.GetProperty("key").GetString(),json.RootElement.GetProperty("at").GetDateTimeOffset(),DateTimeOffset.UtcNow);}catch(Exception e)when(e is IOException or UnauthorizedAccessException or JsonException or FormatException or KeyNotFoundException or InvalidOperationException){return false;}}
 void LaterUpdate_Click(object sender,RoutedEventArgs e){UpdateBanner.Visibility=Visibility.Collapsed;try{Directory.CreateDirectory(Path.GetDirectoryName(UpdateStatePath)!);File.WriteAllText(UpdateStatePath,JsonSerializer.Serialize(new{key=offeredKey,at=DateTimeOffset.UtcNow}));}catch(Exception error)when(error is IOException or UnauthorizedAccessException){}}
 void OpenUpdate_Click(object sender,RoutedEventArgs e){try{Process.Start(new ProcessStartInfo("https://lazying.art/downloads/windows/#onlyideas"){UseShellExecute=true});}catch(System.ComponentModel.Win32Exception){Status.Text="Could not open the download page. Try again.";}}
}
