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
