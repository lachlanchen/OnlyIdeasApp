# Apple public trust roots

Downloaded from [Apple PKI](https://www.apple.com/certificateauthority/) on
2026-09-28. These public DER certificates are inputs to Apple's App Store Server
Library signature and online revocation checks. They contain no private keys.
Production verification pins the OnlyIdeas bundle and App Store app identifier;
Xcode and LocalTesting receipts are never accepted by the server.
