namespace OnlyIdeas.Windows;
public static class AppUpdatePolicy {
 public static int Compare(string a,string b){
  static int[] Parts(string text){if(!System.Text.RegularExpressions.Regex.IsMatch(text,@"^[0-9]{1,8}(\.[0-9]{1,8}){0,3}$"))throw new FormatException("Invalid version");return text.Split('.').Select(int.Parse).ToArray();}
  var left=Parts(a);var right=Parts(b);
  for(int i=0;i<Math.Max(left.Length,right.Length);i++){int x=i<left.Length?left[i]:0,y=i<right.Length?right[i]:0;if(x!=y)return x.CompareTo(y);}return 0;
 }
 public static bool Newer(string version,string build,string installed,string installedBuild){int v=Compare(version,installed),b=Compare(build,installedBuild);return v>0||(v==0&&b>0);}
 public static bool Snoozed(string key,string? saved,DateTimeOffset at,DateTimeOffset now)=>key==saved&&at<=now&&now-at<TimeSpan.FromDays(1);
}
