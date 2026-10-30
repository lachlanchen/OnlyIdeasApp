using OnlyIdeas.Windows;
using System.Security.Cryptography;
using System.Text;
int checks=0;void Check(bool value,string title){if(!value)throw new Exception(title);checks++;}
Check(DesktopPolicy.Owned(new Uri("https://agent.onlyideas.art/?paper=abc")),"Owned navigation");
foreach(var s in new[]{"http://agent.onlyideas.art","https://agent.onlyideas.art.evil.test","https://agent.onlyideas.art:444/","https://evil@agent.onlyideas.art/","file:///C:/secret","javascript:alert(1)"})Check(!DesktopPolicy.Owned(new Uri(s)),"Reject foreign "+s);
foreach(var s in new[]{"file:///C:/secret","javascript:alert(1)","art.onlyideas.app://oauth/complete","https://user:pass@example.com"})Check(!DesktopPolicy.External(new Uri(s)),"Reject unsafe external "+s);
Check(DesktopPolicy.External(new Uri("https://doi.org/10.1234/a")),"Source link");
var verifier=DesktopPolicy.Proof(RandomNumberGenerator.GetBytes(32));Check(verifier.Length==43&&!verifier.Contains('='),"PKCE verifier");Check(DesktopPolicy.Proof(SHA256.HashData(Encoding.ASCII.GetBytes(verifier))).Length==43,"S256 challenge");
Check(DesktopPolicy.AuthFlow(new Uri(DesktopPolicy.Origin+"/api/auth/github?flow="+verifier),verifier),"Exact flow");
Check(!DesktopPolicy.AuthFlow(new Uri(DesktopPolicy.Origin+"/api/auth/github?flow="+verifier+"&next=https://evil.test"),verifier),"No injected callback");
Console.WriteLine($"{checks} Windows policy checks passed.");

void UpdateCheck(bool ok){if(!ok)throw new Exception("Update policy failed");}
UpdateCheck(AppUpdatePolicy.Compare("1.10","1.9")>0);UpdateCheck(AppUpdatePolicy.Compare("1.2","1.2.0")==0);
UpdateCheck(AppUpdatePolicy.Newer("1.1","1","1.0","99"));UpdateCheck(AppUpdatePolicy.Newer("1.1","10","1.1","9"));
UpdateCheck(!AppUpdatePolicy.Newer("1.0.9","39","1.0.10","40"));UpdateCheck(!AppUpdatePolicy.Newer("1.1","9","1.1","10"));UpdateCheck(!AppUpdatePolicy.Newer("1.1","10","1.1","10"));
foreach(var invalid in new[]{"bad","1..2","1.2-beta","999999999999"}){try{AppUpdatePolicy.Compare(invalid,"1");throw new Exception("accepted invalid version");}catch(FormatException){}}
var at=DateTimeOffset.UtcNow;UpdateCheck(AppUpdatePolicy.Snoozed("x","x",at,at.AddSeconds(1)));UpdateCheck(!AppUpdatePolicy.Snoozed("y","x",at,at.AddSeconds(1)));UpdateCheck(!AppUpdatePolicy.Snoozed("x","x",at,at.AddDays(1)));UpdateCheck(!AppUpdatePolicy.Snoozed("x","x",at.AddSeconds(1),at));
Console.WriteLine("15 Windows update policy checks passed.");
