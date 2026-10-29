namespace OnlyIdeas.Windows;
// Shared by the executable and the portable policy regression runner.
public static class DesktopPolicy {
 public const string Origin="https://agent.onlyideas.art";
 public static bool Owned(Uri? uri)=>uri is not null&&uri.Scheme=="https"&&uri.Host=="agent.onlyideas.art"&&uri.IsDefaultPort&&string.IsNullOrEmpty(uri.UserInfo);
 public static bool External(Uri? uri)=>uri is not null&&(uri.Scheme=="https"||uri.Scheme=="http")&&string.IsNullOrEmpty(uri.UserInfo);
 public static bool AuthStart(Uri? uri)=>Owned(uri)&&uri!.AbsolutePath=="/api/auth/github";
 public static bool AuthFlow(Uri? uri,string flow)=>AuthStart(uri)&&uri!.Query=="?flow="+Uri.EscapeDataString(flow);
 public static string Proof(byte[] bytes)=>Convert.ToBase64String(bytes).TrimEnd('=').Replace('+','-').Replace('/','_');
}
