# OnlyIdeas for Windows

The Windows preview opens the OnlyIdeas reading room in a native desktop window.
Read papers, search their text, use contents, zoom figures, highlight passages and
keep private notes with the same OnlyIdeas account.

## Run the preview

Extract `OnlyIdeas-1.0.10-windows-x64-preview.zip`, then open `OnlyIdeas.exe` inside
the extracted folder. Keep its accompanying files together. The package includes
the .NET runtime and does not require administrator access.

The target is Windows 10 version 2004 or later and Windows 11 on x64. Microsoft
Edge WebView2 Runtime must be installed; the app offers Microsoft's download page
if it is missing. The reading room currently requires an internet connection to
open and synchronize. Sign-in opens in the system browser. Return to OnlyIdeas
when it finishes, or use Cancel in the app.

Use F5 to refresh and Alt+Left for browser history. The reader also has its own
back button and navigation tools.

This is an **unsigned preview**, built on Linux with the Windows targeting pack.
The executable was checked on Windows 11 Enterprise (26200), with WebView2
156.0.4314.50. It opened a real public paper, loaded all four reader tools, searched
the paper and enlarged a figure without horizontal overflow. All 409 packaged
binary hashes were verified before that run. The isolated, nonactivating test
window and its browser children exited cleanly.

Windows 10 execution, accessibility, real provider sign-in and an installer have
not yet been qualified. It is not a Microsoft Store release.

## Build

Use .NET SDK 10 and the pinned WebView2 package:

```sh
dotnet publish windows/OnlyIdeas.Windows.csproj -c Release -r win-x64 \
  --self-contained true -p:DebugType=None -o release/windows-1.0.10-x64 -m:1
dotnet run --project tools/windows/policy-tests/PolicyTests.csproj -c Release
python3 tools/windows/package.py
```

The window accepts top-level navigation only to `https://agent.onlyideas.art`.
Explicit external HTTP(S) links open in the system browser. It exposes no host
objects or web-message commands, rejects certificate errors and does not grant
camera, microphone or location permission. Its own WebView2 profile lives under
`LocalAppData/LazyingArt/OnlyIdeas/WebView2`.

GitHub uses the existing OnlyIdeas native S256 flow, with a ten-minute local
cancellation deadline and one-use completion. Only the app session is stored as a
Secure, HttpOnly cookie. Provider tokens, passwords and confidential client
credentials never enter the package. Windows does not register new providers or
change existing account mappings, subscriptions or rewards.

Implementation references: [WebView2 security](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security)
and [runtime distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Single-file download

The [Windows download](https://lazying.art/downloads/windows/#onlyideas) now includes
a single EXE with its .NET dependencies. No extraction or installer is needed.
Run `bash tools/windows/build.sh` with .NET SDK10.0.401 to reproduce it.
The exact EXE passed on Windows11: a real public research paper, four reader tools,
contents, search and figure enlargement. The isolated test profile and process
were removed afterward. System-browser provider sign-in remains unqualified.
