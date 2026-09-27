import SwiftUI
import AuthenticationServices
import UniformTypeIdentifiers
import WebKit

private let accent = Color(red: 0.13, green: 0.36, blue: 0.28)
struct NativeReadingApp: View {
  @StateObject private var store = ReadingStore()
  @State private var tab = 0
  var body: some View {
    TabView(selection: $tab) {
      NavigationView { NativeLibrary(profile: { tab = 2 }) }.id(store.account?.id ?? "public")
        .navigationViewStyle(.stack).tabItem {
          Label("Library", systemImage: "books.vertical")
        }.tag(0)
      NavigationView { NativeAgent() }.navigationViewStyle(.stack).tabItem {
        Label("Agent", systemImage: "bubble.left.and.bubble.right")
      }.tag(1)
      NavigationView { NativeProfile() }.navigationViewStyle(.stack).tabItem {
        Label("Profile", systemImage: "person.crop.circle")
      }.tag(2)
    }.environmentObject(store).tint(accent).preferredColorScheme(
      store.appearance == "system" ? nil : store.appearance == "dark" ? .dark : .light
    )
    .sheet(isPresented: $store.showSignIn) { NativeSignIn().environmentObject(store) }
    .sheet(isPresented: $store.showReport) { ReportContent().environmentObject(store) }
    .task { await store.refresh() }
    .alert(
      "OnlyIdeas",
      isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })
    ) {
      Button("OK") { store.error = nil }
    } message: {
      Text(store.error ?? "")
    }
  }
}
struct NativeSignIn: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  var body: some View {
    NavigationView {
      VStack(alignment: .leading, spacing: 24) {
        Image(systemName: "books.vertical").font(.system(size: 48)).foregroundColor(accent)
        Text("Your reading space").font(.largeTitle.bold())
        Text("Keep your papers and conversations together. Choose an account to continue.").font(.title3)
        Button { Task { await store.signInWithApple() } } label: {
          Label("Continue with Apple", systemImage: "apple.logo").font(.headline).frame(maxWidth: .infinity).padding()
        }.buttonStyle(.borderedProminent).tint(.primary).disabled(store.signingIn)
        Button { Task { await store.signInWithGitHub() } } label: {
          Text("Continue with GitHub").font(.headline).frame(maxWidth: .infinity).padding()
        }.buttonStyle(.bordered).disabled(store.signingIn)
        Text("Use the same sign-in method to return to your account. Apple and GitHub accounts are separate.").font(.footnote).foregroundColor(.secondary)
        Link("Privacy", destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")!)
        Spacer()
      }.padding(28).toolbar { Button("Cancel") { dismiss() } }
    }
  }
}
struct NativeLibrary: View {
  @EnvironmentObject var store: ReadingStore
  var profile: () -> Void
  @State private var query = ""
  @State private var picker = false
  @State private var requests = false
  var visible: [ResearchPaper] {
    store.papers.filter {
      query.isEmpty || ($0.title + " " + ($0.authors ?? "")).localizedCaseInsensitiveContains(query)
    }
  }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        HStack {
          VStack(alignment: .leading, spacing: 8) {
            Text("Your next idea\nstarts with a paper.").font(
              .system(.title, design: .default).weight(.bold))
            Text("Read, ask, and make connections.").font(.title3).foregroundColor(.secondary)
          }
          Spacer()
        }.padding(.top, 8)
        Button {
          if store.account == nil { Task { await store.signIn() } } else { picker = true }
        } label: {
          Label(store.busy ? "Adding your paper…" : "Add a paper", systemImage: "plus").font(
            .headline
          ).frame(maxWidth: .infinity).padding(.vertical, 9)
        }.buttonStyle(.borderedProminent).disabled(store.busy)
        if store.offline {
          Label("Offline · downloaded papers", systemImage: "arrow.down.circle.fill").font(.body)
            .foregroundColor(.secondary)
        }
        HStack {
          Text("Reading library").font(.title2.weight(.semibold))
          Spacer()
          Text("\(visible.count)").font(.title3).foregroundColor(.secondary)
        }
        ForEach(visible) { paper in
          NavigationLink(destination: NativePaper(paper: paper)) {
            PaperRow(paper: paper, downloaded: store.isDownloaded(paper.id))
          }.buttonStyle(.plain)
        }
        if visible.isEmpty {
          Text(
            query.isEmpty
              ? "Your papers will appear here. Add a PDF or ask the agent to find one."
              : "No papers match your search."
          ).font(.title3).foregroundColor(.secondary).padding(.vertical, 20)
        }
        if !store.jobs.isEmpty {
          Button {
            requests = true
          } label: {
            Label("Conversion requests", systemImage: "arrow.triangle.2.circlepath").font(.headline)
              .padding(.vertical, 10)
          }
        }
      }.padding(22)
    }.background(Color(.systemGroupedBackground)).navigationTitle("OnlyIdeas")
      .searchable(text: $query, prompt: "Search your papers")
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button(action: profile) {
            Image(systemName: "person.crop.circle").font(.title2).frame(width: 44, height: 44)
          }.accessibilityLabel("Open profile")
        }
      }
      .refreshable { await store.refresh() }
      .fileImporter(isPresented: $picker, allowedContentTypes: [.pdf]) { result in
        if case .success(let url) = result {
          Task {
            await store.importPDF(url)
            requests = true
          }
        } else if case .failure(let error) = result {
          store.error = error.localizedDescription
        }
      }
      .sheet(isPresented: $requests) { NativeRequests() }
  }
}
struct PaperRow: View {
  let paper: ResearchPaper
  var downloaded: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        Image(systemName: "doc.richtext").font(.title2).foregroundColor(accent).frame(
          width: 48, height: 54
        ).background(accent.opacity(0.09)).cornerRadius(12)
        Spacer()
        Text(paper.language?.uppercased() ?? "PAPER").font(.subheadline.weight(.bold))
          .foregroundColor(.secondary)
        if downloaded { Image(systemName: "arrow.down.circle.fill").foregroundColor(accent) }
      }
      Text(paper.title).font(.title3.weight(.semibold)).foregroundColor(.primary).fixedSize(
        horizontal: false, vertical: true)
      if let authors = paper.authors, !authors.isEmpty {
        Text(authors).font(.body).foregroundColor(.secondary).lineLimit(2)
      }
      HStack {
        Label(
          paper.visibility == "private" ? "Private paper" : "Reading room",
          systemImage: paper.visibility == "private" ? "lock" : "book"
        ).font(.subheadline).foregroundColor(.secondary)
        Spacer()
        Image(systemName: "arrow.up.right").foregroundColor(accent)
      }
    }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(
      Color(.secondarySystemGroupedBackground)
    ).cornerRadius(22)
  }
}
struct NativeAgent: View {
  @EnvironmentObject var store: ReadingStore
  @State private var draft = ""
  @State private var history = false
  @State private var requests = false
  var body: some View {
    VStack(spacing: 0) {
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(alignment: .leading, spacing: 22) {
            if store.messages.isEmpty { welcome }
            ForEach(store.messages) { message in
              AgentBubble(message: message, requests: $requests).contextMenu {
                if message.role == "assistant" {
                  Button("Report AI response") { store.reportContext = "Agent message \(message.id) in conversation \(store.conversationID ?? "")"; store.showReport = true }
                }
              }
            }
            if !store.agentStatus.isEmpty {
              HStack(alignment: .top) {
                ProgressView()
                Text(store.agentStatus).font(.body).foregroundColor(.secondary)
              }
            }
            Color.clear.frame(height: 1).id("end")
          }.padding(22)
        }.onChange(of: store.messages.count) { _ in
          withAnimation { proxy.scrollTo("end", anchor: .bottom) }
        }
      }
      composer
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("Agent")
    .toolbar {
      ToolbarItemGroup(placement: .keyboard) {
        Spacer()
        Button("Done") {
          UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
      }
      ToolbarItem(placement: .navigationBarLeading) {
        Button {
          history = true
          Task { await store.loadConversations() }
        } label: {
          Image(systemName: "clock.arrow.circlepath").frame(width: 44, height: 44)
        }.accessibilityLabel("Conversation history")
      }
      ToolbarItem(placement: .navigationBarTrailing) {
        Button {
          store.newConversation()
        } label: {
          Image(systemName: "square.and.pencil").frame(width: 44, height: 44)
        }.accessibilityLabel("New conversation")
      }
    }
    .sheet(isPresented: $history) {
      NavigationView {
        List {
          if store.conversations.isEmpty { Text("Your conversations will appear here.") }
          ForEach(store.conversations) { chat in
            Button {
              history = false
              Task { await store.selectConversation(chat) }
            } label: {
              Text(chat.title).font(.body).padding(.vertical, 8)
            }.swipeActions {
              Button("Delete", role: .destructive) { Task { await store.deleteConversation(chat) } }
            }
          }
        }.navigationTitle("Conversations").toolbar { Button("Done") { history = false } }
      }
    }
    .sheet(isPresented: $requests) { NativeRequests() }
    .task {
      while !Task.isCancelled {
        if let id = store.conversationID { await store.loadConversation(id) }
        try? await Task.sleep(nanoseconds: 3_000_000_000)
      }
    }
  }
  var welcome: some View {
    VStack(alignment: .leading, spacing: 18) {
      Image(systemName: "sparkle.magnifyingglass").font(.largeTitle).foregroundColor(accent)
      Text("What are you curious about?").font(.largeTitle.weight(.bold))
      Text("Find open papers, follow a question, and bring the useful ones into your library.")
        .font(.title3).foregroundColor(.secondary)
      ForEach(
        ["Find papers about quantum entanglement", "Find research on language learning"], id: \.self
      ) { text in
        Button {
          Task { await store.send(text) }
        } label: {
          HStack {
            Text(text).font(.body)
            Spacer()
            Image(systemName: "arrow.up.left")
          }
          .padding(18).frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.secondarySystemGroupedBackground)).cornerRadius(16)
        }.buttonStyle(.plain)
      }
    }.padding(.vertical, 24)
  }
  var composer: some View {
    VStack(spacing: 8) {
      HStack(alignment: .bottom, spacing: 12) {
        TextEditor(text: $draft).font(.title3).frame(minHeight: 54, maxHeight: 110)
          .accessibilityLabel("Message the paper agent")
          .overlay(alignment: .topLeading) {
            if draft.isEmpty {
              Text("Ask a question or paste a paper link…").font(.title3).foregroundColor(
                .secondary
              )
              .padding(.top, 8).padding(.leading, 4).allowsHitTesting(false)
            }
          }
        Button {
          let text = draft
          Task {
            await store.send(text)
            if store.error == nil { draft = "" }
          }
        } label: {
          Image(systemName: "arrow.up").font(.title3.weight(.bold)).foregroundColor(.white)
            .frame(width: 48, height: 48).background(accent).clipShape(Circle())
        }.accessibilityLabel("Send message")
          .disabled(
            draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.busy
              || !store.agentStatus.isEmpty)
      }.padding(12).background(Color(.secondarySystemGroupedBackground)).cornerRadius(22)
      Text("Search with the paper agent. Convert when you’re ready.").font(.footnote)
        .foregroundColor(.secondary)
    }.padding(.horizontal, 16).padding(.vertical, 12)
  }
}
struct AgentBubble: View {
  @EnvironmentObject var store: ReadingStore
  let message: AgentMessage
  @Binding var requests: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(message.role == "user" ? "You" : "OnlyIdeas").font(.subheadline.weight(.semibold))
        .foregroundColor(.secondary)
      Text(message.text).font(.title3).textSelection(.enabled).fixedSize(
        horizontal: false, vertical: true)
      ForEach(message.papers ?? []) { paper in
        VStack(alignment: .leading, spacing: 12) {
          Text("\(paper.year ?? "") · Open paper").font(.subheadline).foregroundColor(.secondary)
          Text(paper.title).font(.title3.weight(.semibold))
          Text(paper.authors).font(.body).foregroundColor(.secondary).lineLimit(3)
          DisclosureGroup("Read abstract") { Text(paper.summary).font(.body).padding(.top, 8) }
          Button {
            Task {
              await store.importFound(paper)
              requests = true
            }
          } label: {
            Label("Convert & add", systemImage: "arrow.down.doc").font(.headline).padding(
              .vertical, 5)
          }.buttonStyle(.borderedProminent)
        }.padding(18).background(Color(.secondarySystemGroupedBackground)).cornerRadius(20)
      }
      if message.jobId != nil { Button("View conversion") { requests = true }.font(.headline) }
    }.padding(message.role == "user" ? 18 : 0)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(message.role == "user" ? accent.opacity(0.09) : Color.clear).cornerRadius(20)
  }
}
struct NativeProfile: View {
  @EnvironmentObject var store: ReadingStore
  @State private var confirm = false
  @State private var deleteConfirm = false
  var body: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 12) {
          Image(systemName: "person.crop.circle.fill").font(.system(size: 64)).foregroundColor(
            accent)
          Text(store.account?.name ?? "Your reading space").font(.title.weight(.bold))
          Text(
            store.account.map { "@" + $0.login } ?? "Keep your papers and conversations together."
          ).font(.title3).foregroundColor(.secondary)
        }.padding(.vertical, 18)
        if store.account == nil {
          Button {
            Task { await store.signIn() }
          } label: {
            Label(
              store.signingIn ? "Signing in…" : "Sign in",
              systemImage: "person.badge.key"
            ).font(.headline).padding(.vertical, 8)
          }.disabled(store.signingIn)
        }
      }
      Section("Reading") {
        VStack(alignment: .leading, spacing: 14) {
          HStack {
            Text("Reading text").font(.body)
            Spacer()
            Text("\(Int(store.readingSize)) pt").font(.body.monospacedDigit())
          }
          Slider(
            value: Binding(
              get: { store.readingSize },
              set: {
                store.readingSize = $0
                store.objectWillChange.send()
              }), in: 18...34, step: 1
          ).accessibilityLabel("Reading text size")
          Text("A little more room for your next idea.").font(.system(size: store.readingSize))
            .fixedSize(horizontal: false, vertical: true)
        }.padding(.vertical, 8)
        Picker(
          "Appearance",
          selection: Binding(
            get: { store.appearance },
            set: {
              store.appearance = $0
              store.objectWillChange.send()
            })
        ) {
          Text("System").tag("system")
          Text("Light").tag("light")
          Text("Dark").tag("dark")
        }
      }
      Section("Your library") {
        Label(
          "\(store.papers.filter{$0.visibility=="private"}.count) private papers",
          systemImage: "lock.doc")
        Label("\(store.downloads().count) offline downloads", systemImage: "arrow.down.circle")
      }
      Section("About") {
        Text("OnlyIdeas 1.0").font(.headline)
        Text(
          "Read papers with their equations and figures. Use the connected paper agent to find your next read. Conversations and personal uploads stay in your account."
        ).font(.body).foregroundColor(.secondary)
        Link("Support", destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/support.html")!)
        Link("Privacy", destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")!)
        Link("Community Terms", destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/terms.html")!)
      }
      if store.account != nil {
        Section {
          Button("Report content") { store.reportContext = ""; store.showReport = true }
          NavigationLink("Blocked readers") { BlockedReaders() }
          Button("Delete account", role: .destructive) { deleteConfirm = true }
          Button("Sign out", role: .destructive) { confirm = true }.font(.body).padding(
            .vertical, 8)
        }
      }
    }.navigationTitle("Profile").alert("Permanently delete your account?", isPresented: $deleteConfirm) {
      Button("Cancel", role: .cancel) {}
      Button("Delete account", role: .destructive) { Task { await store.deleteAccount() } }
    } message: {
      Text("Your account, cloud papers, notes, comments, chats and private downloads will be deleted and all sessions signed out. Previously published GitHub copies and others’ copies may remain under their public license. This cannot be undone.")
    }.confirmationDialog(
      "Sign out on this device?", isPresented: $confirm, titleVisibility: .visible
    ) {
      Button("Sign out", role: .destructive) { Task { await store.signOut() } }
    } message: {
      Text(
        "Private offline downloads will be removed. Your cloud library and conversations will remain."
      )
    }
  }
}
struct ReportContent: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  @State private var reason = ""
  @State private var sending = false
  @State private var error = ""
  var body: some View {
    NavigationView {
      Form {
        Text("Tell us which paper or AI response concerns you and why. Reports are private and reviewed by our team.")
        TextEditor(text: $reason).frame(minHeight: 160).accessibilityLabel("Report details")
        if !error.isEmpty { Text(error).foregroundColor(.red) }
        Button(sending ? "Sending…" : "Send report") { Task {
          sending = true
          do { _ = try await store.json("/api/reports", method: "POST", body: ["context": store.reportContext, "reason": reason]); dismiss() }
          catch { self.error = error.localizedDescription }
          sending = false
        } }.disabled(sending || reason.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
      }.navigationTitle("Report content").toolbar { Button("Cancel") { dismiss() } }
    }
  }
}
struct BlockedReaders: View {
  @EnvironmentObject var store: ReadingStore
  @State private var readers: [[String: String]] = []
  func load() async {
    do { let result = try await store.json("/api/blocks"); readers = result["blocks"] as? [[String: String]] ?? [] }
    catch { store.error = error.localizedDescription }
  }
  var body: some View {
    List {
      if readers.isEmpty { Text("You have no blocked readers.") }
      ForEach(readers, id: \.self) { reader in
        HStack {
          Text(reader["name"] ?? "Reader")
          Spacer()
          Button("Unblock") { Task {
            do { _ = try await store.json("/api/blocks/\(reader["id"] ?? "")", method: "DELETE"); await load() }
            catch { store.error = error.localizedDescription }
          } }
        }
      }
    }.navigationTitle("Blocked readers").task { await load() }
  }
}
struct NativeRequests: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  var body: some View {
    NavigationView {
      List {
        ForEach(store.jobs) { job in
          VStack(alignment: .leading, spacing: 10) {
            Label(
              job.kind == "import" ? "Paper conversion" : "Reading request",
              systemImage: job.state == "completed" ? "checkmark.circle.fill" : "clock"
            ).font(.headline)
            Text(job.message).font(.body).foregroundColor(.secondary)
            if let id = job.paperId, job.state == "completed" {
              NavigationLink(
                "Open paper",
                destination: NativePaper(
                  paper: store.papers.first { $0.id == id }
                    ?? ResearchPaper(id: id, title: "Your paper")))
            }
            if job.state == "failed" {
              Button("Try again") {
                Task {
                  do {
                    _ = try await store.json("/api/jobs/\(job.id)/retry", method: "POST", body: [:])
                    await store.loadJobs()
                  } catch { store.error = error.localizedDescription }
                }
              }
            }
          }.padding(.vertical, 10)
        }
      }.navigationTitle("Your requests").toolbar { Button("Done") { dismiss() } }
        .task {
          while !Task.isCancelled {
            await store.loadJobs()
            try? await Task.sleep(nanoseconds: 3_000_000_000)
          }
        }
    }
  }
}
struct NativePaper: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.colorScheme) var scheme
  var paper: ResearchPaper
  @ScaledMetric(relativeTo: .body) private var readingScale: Double = 1
  @State private var document: ReaderDocument?
  @State private var quote = ""
  @State private var discussion = false
  @State private var shareURL: URL?
  @State private var sharing = false
  @State private var readingTools = false
  var body: some View {
    VStack(spacing: 0) {
      if let document = document {
        NativeDocument(
          document: document, size: store.readingSize * readingScale, dark: scheme == .dark,
          quote: $quote)
      } else {
        ProgressView("Opening your paper…").font(.title3).frame(
          maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .navigationTitle(document?.paper.title ?? paper.title).navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .navigationBarTrailing) {
        Button {
          store.readingSize = min(34, store.readingSize + 2)
          store.objectWillChange.send()
        } label: {
          Image(systemName: "textformat.size")
        }.accessibilityLabel("Increase reading text size")
        Menu {
          Button(store.isDownloaded(paper.id) ? "Remove download" : "Read offline") {
            if let document = document {
              do { try store.toggleDownload(document) } catch {
                store.error = error.localizedDescription
              }
            }
          }
          Button("Smaller text") {
            store.readingSize = max(18, store.readingSize - 2)
            store.objectWillChange.send()
          }
          Button("Export Markdown") {
            guard let text = document?.paper.mmd else { return }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(
              "paper-\(paper.id).mmd")
            do {
              try text.write(to: url, atomically: true, encoding: .utf8)
              shareURL = url
              sharing = true
            } catch { store.error = error.localizedDescription }
          }
          Button("Notes, guides & translation") { readingTools = true }
          Button("Discuss this paper") { discussion = true }
        } label: {
          Image(systemName: "ellipsis.circle")
        }.accessibilityLabel("Reading options")
      }
    }
    .safeAreaInset(edge: .bottom) {
      if !quote.isEmpty {
        Button {
          discussion = true
        } label: {
          Label("Discuss selection", systemImage: "text.bubble").font(.headline).padding(14).frame(
            maxWidth: .infinity
          ).background(.regularMaterial)
        }
      }
    }
    .task {
      do { document = try await store.loadPaper(paper) } catch {
        store.error = error.localizedDescription
      }
    }
    .sheet(isPresented: $readingTools) {
      if let document = document { NativeReadingTools(document: document) }
    }
    .sheet(isPresented: $discussion) {
      NativeDiscussion(paper: document?.paper ?? paper, quote: quote)
    }
    .sheet(isPresented: $sharing) { if let shareURL = shareURL { NativeShare(items: [shareURL]) } }
  }
}
struct NativeDocument: UIViewRepresentable {
  let document: ReaderDocument
  let size: Double
  let dark: Bool
  @Binding var quote: String
  func makeCoordinator() -> Coordinator { Coordinator(self) }
  func makeUIView(context: Context) -> WKWebView {
    let c = WKWebViewConfiguration()
    c.userContentController.add(context.coordinator, name: "onlyideas")
    let view = WKWebView(frame: .zero, configuration: c)
    view.navigationDelegate = context.coordinator
    view.isOpaque = false
    view.backgroundColor = .clear
    if let root = Bundle.main.url(forResource: "public", withExtension: nil) {
      view.loadFileURL(
        root.appendingPathComponent("native-reader.html"), allowingReadAccessTo: root)
    }
    return view
  }
  func updateUIView(_ view: WKWebView, context: Context) {
    context.coordinator.parent = self
    context.coordinator.render(view)
  }
  final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    var parent: NativeDocument
    var ready = false
    var revision = ""
    init(_ parent: NativeDocument) { self.parent = parent }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      ready = true
      render(webView)
    }
    func render(_ webView: WKWebView) {
      guard ready else { return }
      let identity = parent.document.paper.id + (parent.document.paper.revision ?? "")
      if revision != identity {
        let data: [String: Any] = [
          "mmd": parent.document.paper.mmd ?? "", "figures": parent.document.figures,
          "fontSize": parent.size, "dark": parent.dark,
        ]
        if let bytes = try? JSONSerialization.data(withJSONObject: data),
          let json = String(data: bytes, encoding: .utf8)
        {
          webView.evaluateJavaScript("window.OnlyIdeasRender && window.OnlyIdeasRender(\(json))") {
            _, _ in
          }
          revision = identity
        }
      }
      webView.evaluateJavaScript(
        "window.OnlyIdeasStyle && window.OnlyIdeasStyle(\(parent.size),\(parent.dark ? "true":"false"))"
      )
    }
    func userContentController(
      _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
      if let data = message.body as? [String: Any], let quote = data["quote"] as? String {
        parent.quote = quote
      }
    }
    func webView(
      _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
      decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
      if navigationAction.navigationType == .linkActivated, let u = navigationAction.request.url,
        u.scheme == "https"
      {
        UIApplication.shared.open(u)
        decisionHandler(.cancel)
      } else {
        decisionHandler(.allow)
      }
    }
  }
}
struct NativeShare: UIViewControllerRepresentable {
  let items: [Any]
  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: items, applicationActivities: nil)
  }
  func updateUIViewController(_ c: UIActivityViewController, context: Context) {}
}
struct NativeDiscussion: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  let paper: ResearchPaper
  let quote: String
  @State private var comments: [PaperComment] = []
  @State private var draft = ""
  @State private var sending = false
  @State private var report: PaperComment?
  @State private var reason = ""
  @State private var acceptedTerms = false
  func load() async {
    do {
      let r = try await store.json("/api/papers/\(paper.id)/comments")
      comments = try store.decoded([PaperComment].self, r["comments"] ?? [])
    } catch { store.error = error.localizedDescription }
  }
  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          if !quote.isEmpty {
            Text(quote).font(.title3).padding().background(accent.opacity(0.08)).cornerRadius(16)
          }
          ForEach(comments) { comment in
            VStack(alignment: .leading, spacing: 8) {
              Text(comment.author).font(.headline)
              if let q = comment.quote, !q.isEmpty {
                Text(q).font(.body).foregroundColor(.secondary)
              }
              Text(comment.text).font(.title3)
              if comment.pending == true { Text("Waiting for community review").font(.caption).foregroundColor(.secondary) }
              if comment.canDelete == true {
                Button("Delete", role: .destructive) {
                  Task {
                    do {
                      _ = try await store.json("/api/comments/\(comment.id)", method: "DELETE")
                      await load()
                    } catch { store.error = error.localizedDescription }
                  }
                }
              } else {
                Button("Report") { report = comment }
                Button("Block reader", role: .destructive) { Task {
                  do { _ = try await store.json("/api/comments/\(comment.id)/block", method: "POST", body: [:]); await load() }
                  catch { store.error = error.localizedDescription }
                } }
              }
            }.padding(.vertical, 8)
          }
          if comments.isEmpty {
            Text("What caught your attention? Leave the first thought.").font(.title3)
              .foregroundColor(.secondary)
          }
          if paper.visibility == "public" {
            Toggle("I accept the Community Terms", isOn: $acceptedTerms)
            Link("Read Community Terms", destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/terms.html")!)
            Text("Public comments are reviewed before other readers can see them.").font(.footnote).foregroundColor(.secondary)
          }
          TextEditor(text: $draft).font(.title3).frame(height: 130)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2)))
            .accessibilityLabel("Your comment")
          Button {
            Task { await post() }
          } label: {
            Label("Post thought", systemImage: "paperplane").font(.headline).padding(.vertical, 8)
              .frame(maxWidth: .infinity)
          }.buttonStyle(.borderedProminent).disabled(
            draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sending || (paper.visibility == "public" && !acceptedTerms))
        }.padding(22)
      }.navigationTitle("Discussion").toolbar { Button("Done") { dismiss() } }.task { await load() }
        .sheet(item: $report) { comment in
          NavigationView {
            Form {
              Text("What should we review?").font(.headline)
              TextEditor(text: $reason).font(.body).frame(height: 150)
              Button("Send report") {
                Task {
                  do {
                    _ = try await store.json(
                      "/api/comments/\(comment.id)/report", method: "POST", body: ["reason": reason]
                    )
                    report = nil
                    reason = ""
                  } catch { store.error = error.localizedDescription }
                }
              }.disabled(reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }.navigationTitle("Report comment").toolbar { Button("Cancel") { report = nil } }
          }
        }
    }
  }
  func post() async {
    guard store.account != nil else {
      await store.signIn()
      return
    }
    sending = true
    defer { sending = false }
    do {
      _ = try await store.json(
        "/api/papers/\(paper.id)/comments", method: "POST",
        body: [
          "text": draft, "quote": quote, "id": UUID().uuidString.lowercased(),
          "revision": paper.revision ?? "", "acceptTerms": acceptedTerms,
        ])
      draft = ""
      await load()
    } catch { store.error = error.localizedDescription }
  }
}

struct NativeReadingTools: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  let document: ReaderDocument
  @State private var notes = ""
  @State private var language = "zh-Hans"
  @State private var section = ""
  @State private var artifacts: [ReadingArtifact] = []
  @State private var pending = false
  @State private var notice = ""
  private let languages = [
    ("en", "English"), ("zh-Hans", "简体中文"), ("zh-Hant", "繁體中文"), ("ja", "日本語"), ("ko", "한국어"),
    ("fr", "Français"), ("de", "Deutsch"), ("es", "Español"), ("ar", "العربية"), ("ru", "Русский"),
    ("vi", "Tiếng Việt"),
  ]
  var body: some View {
    NavigationView {
      Form {
        Section("Private notes") {
          TextEditor(text: $notes).font(.title3).frame(minHeight: 160).accessibilityLabel(
            "Private notes")
          Button("Save notes") { Task { await saveNotes() } }.disabled(pending)
        }
        Section("Read in another way") {
          Picker("Language", selection: $language) {
            ForEach(languages, id: \.0) { value in Text(value.1).bold().tag(value.0) }
          }
          Picker("Passage", selection: $section) {
            Text("Whole paper").tag("")
            ForEach(document.paper.sections ?? []) { value in Text(value.title).tag(value.id) }
          }
          Button("Create a reading guide") { Task { await assist("digest") } }.disabled(pending)
          Button("Translate") { Task { await assist("translation") } }.disabled(pending)
          Text(
            "AI generated text can be wrong. Check it against the original paper. Requests use your shared model allowance."
          ).font(.body).foregroundColor(.secondary)
          if !notice.isEmpty { Text(notice).font(.body).foregroundColor(accent) }
        }
        Section("Saved guides and translations") {
          ForEach(artifacts) { artifact in
            NavigationLink(destination: NativeArtifact(document: document, artifact: artifact)) {
              VStack(alignment: .leading, spacing: 6) {
                Text(artifact.kind == "digest" ? "Reading guide" : "Translation").font(.headline)
                Text(languages.first { $0.0 == artifact.language }?.1 ?? artifact.language).font(
                  .body.weight(.bold))
              }.padding(.vertical, 6)
            }
          }
          Button("Refresh results") { Task { await loadArtifacts() } }
        }
      }.navigationTitle("Reading tools").toolbar { Button("Done") { dismiss() } }
        .task {
          guard store.account != nil else {
            notice = "Sign in from Profile to save notes and request a guide."
            return
          }
          do {
            let r = try await store.json("/api/papers/\(document.paper.id)/notes")
            notes = r["text"] as? String ?? ""
            await loadArtifacts()
          } catch { store.error = error.localizedDescription }
        }
    }
  }
  func saveNotes() async {
    pending = true
    defer { pending = false }
    do {
      _ = try await store.json(
        "/api/papers/\(document.paper.id)/notes", method: "PUT", body: ["text": notes])
      notice = "Your private notes are saved."
    } catch { store.error = error.localizedDescription }
  }
  func assist(_ kind: String) async {
    pending = true
    defer { pending = false }
    do {
      _ = try await store.json(
        "/api/papers/\(document.paper.id)/assist", method: "POST",
        body: ["kind": kind, "language": language, "sectionId": section])
      notice = "Request saved. Refresh results when the conversion request is complete."
      await store.loadJobs()
      await loadArtifacts()
    } catch { store.error = error.localizedDescription }
  }
  func loadArtifacts() async {
    do {
      let r = try await store.json("/api/papers/\(document.paper.id)/artifacts")
      artifacts = try store.decoded([ReadingArtifact].self, r["artifacts"] ?? [])
    } catch { store.error = error.localizedDescription }
  }
}
struct NativeArtifact: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.colorScheme) var scheme
  let document: ReaderDocument
  let artifact: ReadingArtifact
  @ScaledMetric(relativeTo: .body) private var readingScale: Double = 1
  @State private var quote = ""
  var derived: ReaderDocument {
    var value = document
    value.paper.mmd = artifact.text
    value.paper.revision = artifact.id
    return value
  }
  var body: some View {
    VStack(spacing: 0) {
      Text("AI generated · \(artifact.model)").font(.body).foregroundColor(.secondary).padding()
      NativeDocument(
        document: derived, size: store.readingSize * readingScale, dark: scheme == .dark,
        quote: $quote)
    }.navigationTitle(artifact.kind == "digest" ? "Reading guide" : "Translation")
      .navigationBarTitleDisplayMode(.inline)
  }
}
