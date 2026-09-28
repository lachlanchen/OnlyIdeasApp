import SwiftUI
import UserNotifications
import StoreKit
import AuthenticationServices
import UniformTypeIdentifiers
import WebKit
import PhotosUI

private let ideaGradient = LinearGradient(colors: [Color(red:0.0,green:0.49,blue:0.60), Color(red:0.22,green:0.41,blue:0.88), Color(red:0.48,green:0.27,blue:0.83)], startPoint:.topLeading,endPoint:.bottomTrailing)
private let accent = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red:0.72,green:0.68,blue:1,alpha:1) : UIColor(red:0.34,green:0.27,blue:0.81,alpha:1) })
struct NativeReadingApp: View {
  @StateObject private var store = ReadingStore()
  @State private var tab = 0
  @State private var spaceSection = "saved"
  init() {}
  #if DEBUG
  init(qaStore: ReadingStore) { _store = StateObject(wrappedValue: qaStore) }
  #endif
  @ViewBuilder private var navigation: some View {
    #if targetEnvironment(macCatalyst)
    HStack(spacing: 0) {
      VStack(alignment: .leading, spacing: 16) {
        Text("OnlyIdeas").font(.title.bold()).foregroundStyle(ideaGradient).padding(.bottom, 12)
        Button { tab = 0 } label: { Label(T("Library"), systemImage: "books.vertical").frame(maxWidth: .infinity, alignment: .leading) }.keyboardShortcut("1", modifiers: .command)
        Button { tab = 1 } label: { Label(T("Agent"), systemImage: "bubble.left.and.bubble.right").frame(maxWidth: .infinity, alignment: .leading) }.keyboardShortcut("2", modifiers: .command)
        Button { tab = 3 } label: { Label(T("Your space"), systemImage: "tray").frame(maxWidth: .infinity, alignment: .leading) }
        Button { tab = 2 } label: { Label(T("Profile"), systemImage: "person.crop.circle").frame(maxWidth: .infinity, alignment: .leading) }.keyboardShortcut("3", modifiers: .command)
        Spacer()
        Button { tab = 2 } label: { Label(T("Settings"), systemImage: "gearshape").frame(maxWidth: .infinity, alignment: .leading) }.keyboardShortcut(",", modifiers: .command)
      }.buttonStyle(.bordered).padding(20).frame(width: 210).background(Color(.secondarySystemGroupedBackground))
      Divider()
      // Keep each navigation history and in-progress composer while changing sections.
      TabView(selection: $tab) {
        NavigationView { NativeLibrary(profile: { tab = 2 }) }.id(store.account?.id ?? "public")
          .navigationViewStyle(.stack).toolbar(.hidden, for: .tabBar).tag(0)
        NavigationView { NativeAgent() }.navigationViewStyle(.stack)
          .toolbar(.hidden, for: .tabBar).tag(1)
        NavigationView { NativeReadingSpace(initialSection:spaceSection) }.navigationViewStyle(.stack).toolbar(.hidden, for: .tabBar).tag(3)
        NavigationView { NativeProfile() }.navigationViewStyle(.stack)
          .toolbar(.hidden, for: .tabBar).tag(2)
      }
    }
    #else
    TabView(selection: $tab) {
      NavigationView { NativeLibrary(profile: { tab = 2 }) }.id(store.account?.id ?? "public")
        .navigationViewStyle(.stack).tabItem {
          Label(T("Library"), systemImage: "books.vertical")
        }.tag(0)
      NavigationView { NativeAgent() }.navigationViewStyle(.stack).tabItem {
        Label(T("Agent"), systemImage: "bubble.left.and.bubble.right")
      }.tag(1)
      NavigationView { NativeReadingSpace(initialSection:spaceSection) }.navigationViewStyle(.stack).tabItem {Label(T("Your space"),systemImage:"tray")}.badge(store.inboxUnread).tag(3)
      NavigationView { NativeProfile() }.navigationViewStyle(.stack).tabItem {
        Label(T("Profile"), systemImage: "person.crop.circle")
      }.tag(2)
    }
    #endif
  }
  var body: some View {
    navigation.id(store.language).environment(\.locale,Locale(identifier:UILanguage.current)).environment(\.layoutDirection,UILanguage.current == "ar" ? .rightToLeft : .leftToRight).environmentObject(store).tint(accent).preferredColorScheme(
      store.appearance == "system" ? nil : store.appearance == "dark" ? .dark : .light
    )
    .sheet(isPresented: $store.showSignIn) { NativeSignIn().environmentObject(store) }
    .sheet(isPresented: $store.showReport) { ReportContent().environmentObject(store) }
    .onReceive(store.$requestedPlanID) { value in
      if value != nil {tab=2;if store.account==nil {store.showSignIn=true}}
    }
    .task { await store.refresh() }
    .onChange(of:store.account?.id){id in if id==nil {ReadingReminder.cancel();store.inboxUnread=0}}
    .onReceive(Timer.publish(every:30,on:.main,in:.common).autoconnect()){_ in guard let id=store.account?.id,UIApplication.shared.applicationState == .active else{return};Task{if let r=try? await store.json("/api/inbox"),store.account?.id==id {store.inboxUnread=r["unread"]as?Int ?? 0}}}
    .onReceive(NotificationCenter.default.publisher(for:Notification.Name("OnlyIdeas.OpenSpace"))){_ in spaceSection="daily";tab=3;UserDefaults.standard.removeObject(forKey:"onlyideas.open.daily")}
    .onReceive(NotificationCenter.default.publisher(for:Notification.Name("OnlyIdeas.Ask"))){event in
      guard let text=event.object as? String else{return};tab=1;Task{store.newConversation();await store.send(text)}
    }
    .onAppear{if UserDefaults.standard.bool(forKey:"onlyideas.open.daily"){spaceSection="daily";tab=3;UserDefaults.standard.removeObject(forKey:"onlyideas.open.daily")}}
    #if DEBUG
    .onReceive(NotificationCenter.default.publisher(for: Notification.Name("OnlyIdeas.QA.Tab"))) { event in
      if let value = event.object as? Int, (0...2).contains(value) { tab = value }
    }
    #endif
    .alert(
      "OnlyIdeas",
      isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })
    ) {
      Button(T("OK")) { store.error = nil }
    } message: {
      Text(T(store.error ?? ""))
    }
    .alert(T("Use reading credits?"),isPresented:Binding(get:{store.creditPrompt != nil},set:{if !$0 {store.resolveCreditPrompt(false)}})) {
      Button(T("Cancel"),role:.cancel) {store.resolveCreditPrompt(false)}
      Button(T("Continue")) {store.resolveCreditPrompt(true)}
    } message: {Text(store.creditPrompt ?? "")}
    .alert(T("Check paper match"),isPresented:Binding(get:{store.matchPrompt != nil},set:{if !$0 {store.resolveMatch(false)}})) {
      Button(T("Cancel"),role:.cancel){store.resolveMatch(false)}
      Button(T("This PDF matches")){store.resolveMatch(true)}
    } message:{Text(store.matchPrompt ?? "")}
  }
}
struct NativeSignIn: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  var body: some View {
    NavigationView {
      VStack(alignment: .leading, spacing: 24) {
        Image(systemName: "books.vertical").font(.system(size: 48)).foregroundColor(accent)
        Text(T("Your reading space")).font(.largeTitle.bold())
        Text(T("Keep your papers and conversations together. Choose an account to continue.")).font(.title3)
        Button { Task { await store.signInWithApple() } } label: {
          Label(T("Continue with Apple"), systemImage: "apple.logo").font(.headline).frame(maxWidth: .infinity).padding()
        }.buttonStyle(.borderedProminent).tint(.primary).disabled(store.signingIn)
        Button { Task { await store.signInWithGitHub() } } label: {
          Text(T("Continue with GitHub")).font(.headline).frame(maxWidth: .infinity).padding()
        }.buttonStyle(.bordered).disabled(store.signingIn)
        Text(T("Use the same sign-in method to return to your account. Apple and GitHub accounts are separate.")).font(.footnote).foregroundColor(.secondary)
        Link(T("Privacy"), destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")!)
        Spacer()
      }.padding(28).toolbar { Button(T("Cancel")) { dismiss() } }
    }
  }
}
struct NativeLibrary: View {
  @EnvironmentObject var store: ReadingStore
  var profile: () -> Void
  @State private var query = ""
  @State private var browseResearch=true
  @State private var options = false
  @State private var picker = false
  @State private var requests = false
  @State private var selectedPaper: String?
  var visible: [ResearchPaper] {
    store.papers.filter {
      query.isEmpty || researchMatches(query,[$0.title,$0.authors ?? "",$0.discipline ?? "",$0.subdiscipline ?? "",$0.journal ?? "",$0.year ?? "",$0.doi ?? ""].joined(separator:" "))
    }
  }
  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: 12) {
        HStack {
          VStack(alignment: .leading, spacing: 8) {
            Text(T("Your reading room")).foregroundStyle(ideaGradient).font(
              .system(.title3, design: .default).weight(.bold))
            Text(T("Read, ask, and make connections.")).font(.subheadline).foregroundColor(.secondary)
          }
          Spacer()
        }.padding(.top, 8)
        Button {
          if store.account == nil { Task { await store.signIn() } } else { picker = true }
        } label: {
          Label(T(store.busy ? "Adding your paper…" : "Add a paper"), systemImage: "plus").font(
            .headline
          ).frame(maxWidth: .infinity).padding(.vertical, 9)
        }.buttonStyle(.borderedProminent).disabled(store.busy)
        if store.offline {
          Label(T("Offline · cached papers"), systemImage: "arrow.down.circle.fill").font(.body)
            .foregroundColor(.secondary)
        }
        Picker(T("Library"),selection:$browseResearch){Text(T("Research for you")).tag(true);Text(T("Reading library")).tag(false)}.pickerStyle(.segmented)
        if !query.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty {
          Button {NotificationCenter.default.post(name:Notification.Name("OnlyIdeas.Ask"),object:query)} label:{Label(T("Ask the agent"),systemImage:"arrow.up.message").frame(maxWidth:.infinity,alignment:.leading)}.buttonStyle(.bordered)
        }
        if browseResearch && !query.isEmpty {ForEach(Array(visible.prefix(3))){paper in NavigationLink(destination:NativePaper(paper:paper)){PaperRow(paper:paper,downloaded:store.isDownloaded(paper.id))}.buttonStyle(.plain)}}
        if browseResearch {ResearchDiscovery(query:$query,requests:{requests=true})}
        if !browseResearch {
        HStack {
          Text(T("Reading library")).font(.title2.weight(.semibold))
          Spacer()
          Text("\(visible.count)").font(.title3).foregroundColor(.secondary)
        }
        ForEach(visible) { paper in
          NavigationLink(destination: NativePaper(paper: paper), tag: paper.id, selection: $selectedPaper) {
            PaperRow(paper: paper, downloaded: store.isDownloaded(paper.id))
          }.buttonStyle(.plain)
          NativePaperActions(reference:paper.id,title:paper.title)
        }
        if visible.isEmpty {
          Text(
            T(query.isEmpty
              ? "Add a PDF or ask the agent to find your next paper."
              : "No papers here yet. Add a paper or try another search.")
          ).font(.title3).foregroundColor(.secondary).padding(.vertical, 20)
        }
        }
        if !store.jobs.isEmpty {
          Button {
            requests = true
          } label: {
            Label(T("Conversion requests"), systemImage: "arrow.triangle.2.circlepath").font(.headline)
              .padding(.vertical, 10)
          }
        }
      }.padding(14)
    }.background(Color(.systemGroupedBackground)).navigationTitle("OnlyIdeas").navigationBarTitleDisplayMode(.inline)
      #if DEBUG
      .onReceive(NotificationCenter.default.publisher(for: Notification.Name("OnlyIdeas.QA.Paper"))) { event in
        if let id = event.object as? String, store.papers.contains(where: { $0.id == id }) { browseResearch=false;selectedPaper = id }
      }
      #endif
      .searchable(text: $query, prompt:T("Find a paper or ask to fetch it…"))
      .toolbar {
        ToolbarItem(placement:.navigationBarLeading) {
          Button {options=true} label: {Text(T(store.sharedImports ? "Shared":"Only me")).font(.subheadline.weight(.semibold)).frame(minHeight:44)}.accessibilityLabel(T("Sharing & credits"))
        }
        ToolbarItem(placement: .navigationBarTrailing) {
          Button(action: profile) {
            Image(systemName: "person.crop.circle").font(.title2).frame(width: 44, height: 44)
          }.accessibilityLabel(T("Open profile"))
        }
      }
      .refreshable { await store.refresh() }
      .fileImporter(isPresented: $picker, allowedContentTypes: [.pdf]) { result in
        if case .success(let url) = result {
          Task {
            await store.importPDF(url, shared: store.sharedImports)
            requests = true
          }
        } else if case .failure(let error) = result {
          store.error = error.localizedDescription
        }
      }
      .sheet(isPresented: $requests) { NativeRequests() }
      .sheet(isPresented: $options) { NativeSharingOptions() }
  }
}
struct PaperRow: View {
  let paper: ResearchPaper
  var downloaded: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      HStack {
        Text(paper.language?.uppercased() ?? "PAPER").font(.caption.weight(.bold))
        Text(T(paper.sharing == "awaiting_review" ? "Shared — pending review" : paper.visibility == "private" ? "Private" : "Reading room")).font(.caption)
        Spacer()
        if downloaded { Image(systemName: "pin.fill").font(.caption) }
        Image(systemName: "chevron.right").font(.caption)
      }.foregroundColor(.secondary)
      Text([paper.discipline,paper.subdiscipline,paper.year,paper.journal].compactMap{$0}.filter{!$0.isEmpty}.joined(separator:" · ")).font(.caption).foregroundColor(.secondary)
      Text(paper.title).font(.headline).foregroundColor(.primary).fixedSize(horizontal: false, vertical: true)
      if let authors = paper.authors, !authors.isEmpty {
        Text(authors).font(.subheadline).foregroundColor(.secondary).lineLimit(2)
      }
    }.padding(14).frame(maxWidth: .infinity, alignment: .leading)
      .background(Color(.secondarySystemGroupedBackground)).cornerRadius(14)
  }
}
struct NativeAgent: View {
  @EnvironmentObject var store: ReadingStore
  @State private var draft = ""
  @State private var history = false
  @State private var requests = false
  @State private var attachPicker = false
  @State private var photoPicker = false
  @State private var options = false
  var body: some View {
    VStack(spacing: 0) {
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(alignment: .leading, spacing: 12) {
            if store.messages.isEmpty { welcome }
            ForEach(store.messages) { message in
              AgentBubble(message: message, requests: $requests).contextMenu {
                if message.role == "assistant" {
                  Button(T("Report AI response")) { store.reportContext = "Agent message \(message.id) in conversation \(store.conversationID ?? "")"; store.showReport = true }
                }
              }
            }
            if !store.agentStatus.isEmpty {
              HStack(alignment: .top) {
                ProgressView()
                Text(T(store.agentStatus)).font(.body).foregroundColor(.secondary)
              }
            }
            Color.clear.frame(height: 1).id("end")
          }.padding(14)
        }.onChange(of: store.messages.count) { _ in
          withAnimation { proxy.scrollTo("end", anchor: .bottom) }
        }
      }
      composer
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle(T("Agent")).navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .keyboard) {
        Spacer()
        Button(T("Done")) {
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
        }.accessibilityLabel(T("Conversation history"))
      }
      ToolbarItem(placement: .navigationBarTrailing) {
        HStack(spacing:0) {
        Button {options=true} label: {Text(T(store.sharedImports ? "Shared":"Only me")).font(.subheadline.weight(.semibold)).frame(minHeight:44)}.accessibilityLabel(T("Sharing & credits"))
        Button {
          store.newConversation()
        } label: {
          Image(systemName: "square.and.pencil").frame(width: 44, height: 44)
        }.accessibilityLabel(T("New conversation"))
        }
      }
    }
    .sheet(isPresented: $history) {
      NavigationView {
        List {
          if store.conversations.isEmpty { Text(T("Your conversations will appear here.")) }
          ForEach(store.conversations) { chat in
            Button {
              history = false
              Task { await store.selectConversation(chat) }
            } label: {
              Text(chat.title == "New conversation" ? T(chat.title) : chat.title).font(.body).padding(.vertical, 8)
            }.swipeActions {
              Button(T("Delete"), role: .destructive) { Task { await store.deleteConversation(chat) } }
            }
          }
        }.navigationTitle(T("Conversations")).toolbar { Button(T("Done")) { history = false } }
      }
    }
    .sheet(isPresented: $requests) { NativeRequests() }
    .sheet(isPresented: $options) { NativeSharingOptions() }
    .fileImporter(isPresented:$attachPicker,allowedContentTypes:[.data],allowsMultipleSelection:true) { result in
      if case .success(let urls)=result { Task { await store.attach(urls) } }
      else if case .failure(let error)=result { store.error=error.localizedDescription }
    }
    .sheet(isPresented:$photoPicker) { NativePhotoPicker { bytes in photoPicker=false;if let bytes { Task { await store.attachData(bytes,name:"Photo.jpg") } } } }
    .task {
      while !Task.isCancelled {
        if let id = store.conversationID { await store.loadConversation(id) }
        try? await Task.sleep(nanoseconds: 3_000_000_000)
      }
    }
  }
  var welcome: some View {
    VStack(alignment: .leading, spacing: 14) {
      Image(systemName: "sparkle.magnifyingglass").font(.largeTitle).foregroundStyle(ideaGradient)
      Text(T("What are you curious about?")).font(.title.weight(.bold))
      Text(T("Find a paper. Ask about your files. Follow an idea."))
        .font(.body).foregroundColor(.secondary)
      ForEach(
        ["Find open papers about quantum entanglement", "Help me find research on language learning"], id: \.self
      ) { text in
        Button {
          Task { await store.send(T(text)) }
        } label: {
          HStack {
            Text(T(text)).font(.body)
            Spacer()
            Image(systemName: "arrow.up.left")
          }
          .padding(14).frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.secondarySystemGroupedBackground)).cornerRadius(16)
        }.buttonStyle(.plain)
      }
    }.padding(.vertical, 12)
  }
  var composer: some View {
    VStack(spacing: 8) {
      ForEach(store.draftAttachments) { file in
        HStack { Image(systemName:"doc.fill").foregroundColor(accent); Text(file.name).font(.footnote).lineLimit(1);Spacer();Button { store.draftAttachments.removeAll{$0.id==file.id} } label:{ Image(systemName:"xmark.circle.fill") }.accessibilityLabel(T("Remove attachment")) }.padding(.horizontal,16)
      }
      if store.attachmentBusy { ProgressView(T("Uploading attachment…")) }
      HStack(alignment: .bottom, spacing: 8) {
        Menu {
          Button(T("Choose files")) { if store.account==nil {Task {await store.signIn()}} else {attachPicker=true} }
          Button(T("Choose photo")) { if store.account==nil {Task {await store.signIn()}} else {photoPicker=true} }
        } label:{Image(systemName:"paperclip").font(.title2).frame(width:40,height:48)}.accessibilityLabel(T("Attach files")).disabled(store.attachmentBusy||store.draftAttachments.count>=3)
        TextEditor(text: $draft).font(.body).frame(minHeight: 54, maxHeight: 110)
          .accessibilityLabel(T("Message the paper agent"))
          .overlay(alignment: .topLeading) {
            if draft.isEmpty {
              Text(T("Ask a question or attach a file…")).font(.body).foregroundColor(
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
            .frame(width: 48, height: 48).background(ideaGradient).clipShape(Circle())
        }.accessibilityLabel(T("Send message"))
          .disabled(
            (draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && store.draftAttachments.isEmpty) || store.busy || store.attachmentBusy
              || !store.agentStatus.isEmpty)
      }.padding(12).background(Color(.secondarySystemGroupedBackground)).cornerRadius(22)
      Text(T("Your chats and notes stay private.")).font(.caption)
        .foregroundColor(.secondary)
    }.padding(.horizontal, 12).padding(.vertical, 8)
  }
}
struct AgentBubble: View {
  @EnvironmentObject var store: ReadingStore
  let message: AgentMessage
  @Binding var requests: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(T(message.role == "user" ? "You" : "OnlyIdeas")).font(.subheadline.weight(.semibold))
        .foregroundColor(.secondary)
      Text(message.role == "assistant" ? T(message.text) : message.text).font(.body).textSelection(.enabled).fixedSize(
        horizontal: false, vertical: true)
      ForEach(message.attachments ?? []) { file in
        HStack { Image(systemName:"doc.fill").foregroundColor(accent);VStack(alignment:.leading){Text(file.name).font(.subheadline);Text(file.state=="ready" ? T("Ready") : file.state=="failed" ? T("Could not prepare file") : T("Preparing your attachments")).font(.caption).foregroundColor(.secondary)};Spacer()
          if let id=file.paperId { NavigationLink(destination:NativePaper(paper:ResearchPaper(id:id,title:file.name))) {Image(systemName:"arrow.up.right")} }
        }.padding(10).background(Color(.tertiarySystemGroupedBackground)).cornerRadius(12)
      }
      ForEach(message.papers ?? []) { paper in
        VStack(alignment: .leading, spacing: 12) {
          Text("\(paper.year ?? "") · \(T("Open paper"))").font(.subheadline).foregroundColor(.secondary)
          Text(paper.title).font(.title3.weight(.semibold))
          Text(paper.authors).font(.body).foregroundColor(.secondary).lineLimit(3)
          DisclosureGroup(T("Read abstract")) { Text(paper.summary).font(.body).padding(.top, 8) }
          if let id=paper.paperId {
            NavigationLink(destination:NativePaper(paper:ResearchPaper(id:id,title:paper.title))) {Label(T("Open paper"),systemImage:"book")}.buttonStyle(.borderedProminent)
          } else {
            Label(T(store.sharedImports ? "Shared after review":"Only me"),systemImage:store.sharedImports ? "globe":"lock").font(.caption).foregroundColor(.secondary)
            Button {Task {await store.importFound(paper,shared:store.sharedImports);requests=true}} label: {Label(T("Fetch & read"),systemImage:"arrow.down.doc").font(.headline).padding(.vertical,5)}.buttonStyle(.borderedProminent)
            NativePDFRecovery(researchId:paper.id,shared:store.sharedImports){requests=true}
          }
          if let source=paper.source,let url=URL(string:source),url.scheme=="https" {Link(T("Source"),destination:url)}
        }.padding(14).background(Color(.secondarySystemGroupedBackground)).cornerRadius(16)
      }
      if message.jobId != nil { Button(T("View conversion")) { requests = true }.font(.headline) }
      ForEach(message.actions ?? []) { action in
        VStack(alignment:.leading,spacing:8){
          Text(action.title ?? "").font(.headline)
          HStack {if ["queued","running"].contains(action.state){ProgressView()};Text(T(action.message)).font(.subheadline)}
          if action.state == "completed",let id=action.paperId {
            if let artifactId=action.artifactId {NavigationLink(destination:NativeAgentResult(paperID:id,artifactID:artifactId)){Label(T("Open result"),systemImage:"doc.text")}.buttonStyle(.borderedProminent)}
            else {NavigationLink(destination:NativePaper(paper:ResearchPaper(id:id,title:action.title ?? ""))){Label(T("Open paper"),systemImage:"book")}.buttonStyle(.borderedProminent)}
          }
          if action.canUpload == true,let job=action.jobId {NativePDFRecovery(recoveryJobId:job,shared:action.sharing == "shared"){requests=true}}
          if action.jobId != nil {Button(T("Your requests")){requests=true}}
        }.padding(12).frame(maxWidth:.infinity,alignment:.leading).background(accent.opacity(0.06)).cornerRadius(14)
      }
    }.padding(message.role == "user" ? 18 : 0)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(message.role == "user" ? accent.opacity(0.09) : Color.clear).cornerRadius(20)
  }
}
struct NativeAgentResult:View {
 @EnvironmentObject var store:ReadingStore
 let paperID:String;let artifactID:String
 @State private var document:ReaderDocument?
 @State private var artifact:ReadingArtifact?
 @State private var notice=""
 var body:some View {Group{if let document,let artifact{NativeArtifact(document:document,artifact:artifact)}else if !notice.isEmpty{Text(T(notice)).padding()}else{ProgressView()}}.task{do{let d=try await store.loadPaper(ResearchPaper(id:paperID,title:""));let result=try await store.json("/api/papers/\(paperID)/artifacts");let a=try store.decoded([ReadingArtifact].self,result["artifacts"] ?? []).first{$0.id==artifactID};guard let a else{throw store.failure(T("This saved result is no longer available."))};document=d;artifact=a}catch{notice=error.localizedDescription}}}
}
struct NativeProfile: View {
  @State private var plans = false
  @EnvironmentObject var store: ReadingStore
  @State private var confirm = false
  @State private var deleteConfirm = false
  var body: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 12) {
          Image(systemName: "person.crop.circle.fill").font(.system(size: 64)).foregroundColor(
            accent)
          Text(store.account?.name ?? T("Your reading space")).font(.title.weight(.bold))
          Text(
            store.account.map { "@" + $0.login } ?? T("Sign in to keep your papers and conversations together.")
          ).font(.title3).foregroundColor(.secondary)
        }.padding(.vertical, 18)
        if store.account == nil {
          Button {
            Task { await store.signIn() }
          } label: {
            Label(
              T(store.signingIn ? "Signing in…" : "Sign in"),
              systemImage: "person.badge.key"
            ).font(.headline).padding(.vertical, 8)
          }.disabled(store.signingIn)
        }
      }
      Section {Button {plans=true} label: {Label(T("Plans & usage"),systemImage:"sparkles").font(.headline)}.accessibilityIdentifier("plans-entry")}
      if store.account != nil { NativeCreditSection() }
      Section(T("Reading")) {
        Picker(T("App language"), selection:Binding(get:{store.language},set:{store.language=$0;store.objectWillChange.send()})) {
          Text(T("System")).tag("system")
          ForEach(UILanguage.choices,id:\.0) { code,name in Text(name).tag(code) }
        }
        VStack(alignment: .leading, spacing: 14) {
          HStack {
            Text(T("Reading text")).font(.body)
            Spacer()
            Text("\(Int(store.readingSize)) pt").font(.body.monospacedDigit())
          }
          Slider(
            value: Binding(
              get: { store.readingSize },
              set: {
                store.readingSize = $0
                store.objectWillChange.send()
              }), in: 15...34, step: 1
          ).accessibilityLabel(T("Reading text size"))
          Text(T("A little more room for your next idea.")).font(.system(size: store.readingSize))
            .fixedSize(horizontal: false, vertical: true)
        }.padding(.vertical, 8)
        Picker(
          T("Appearance"),
          selection: Binding(
            get: { store.appearance },
            set: {
              store.appearance = $0
              store.objectWillChange.send()
            })
        ) {
          Text(T("System")).tag("system")
          Text(T("Light")).tag("light")
          Text(T("Dark")).tag("dark")
        }
      }
      Section(T("Your library")) {
        NavigationLink(T("Saved, liked & activity")){NativeReadingSpace()}
        NavigationLink(T("Interests & notifications")){NativeReadingPreferences()}
        Label(
          T("{count} private papers",["count":String(store.papers.filter{$0.visibility=="private"}.count)]),
          systemImage: "lock.doc")
        Label(T("{count} papers cached on this device",["count":String(store.downloads().count)]), systemImage: "arrow.down.circle")
      }
      Section(T("About")) {
        Text("OnlyIdeas \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""))").font(.headline)
        Text(
          T("Read papers with their equations and figures. Use the connected paper agent to find your next read. Conversations and personal uploads stay in your account.")
        ).font(.body).foregroundColor(.secondary)
        Link(T("Support"), destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/support.html")!)
        Link(T("Privacy"), destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")!)
        Link(T("Community Terms"), destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/terms.html")!)
      }
      if store.account != nil {
        Section {
          Button(T("Report content")) { store.reportContext = ""; store.showReport = true }
          NavigationLink(T("Blocked readers")) { BlockedReaders() }
          Button(T("Delete account"), role: .destructive) { deleteConfirm = true }
          Button(T("Sign out"), role: .destructive) { confirm = true }.font(.body).padding(
            .vertical, 8)
        }
      }
    }.navigationTitle(T("Profile"))
    .sheet(isPresented:$plans) {NavigationView {Form {NativeSubscriptionSection()}.navigationTitle(T("Monthly plans")).toolbar {ToolbarItem(placement:.confirmationAction){Button(T("Done")){plans=false}}}}.navigationViewStyle(.stack)}
    #if DEBUG
    .onReceive(NotificationCenter.default.publisher(for:Notification.Name("OnlyIdeas.QA.Plans"))) {event in plans=event.object as? Bool ?? true}
    #endif
    .alert(T("Permanently delete your account?"), isPresented: $deleteConfirm) {
      Button(T("Cancel"), role: .cancel) {}
      Button(T("Delete account"), role: .destructive) { Task { await store.deleteAccount() } }
    } message: {
      Text(T("Your account, cloud papers, notes, comments, chats and private downloads will be deleted and all sessions signed out. Previously published GitHub copies and others’ copies may remain under their public license. This cannot be undone.")+"\n\n"+T("Deleting your account does not cancel store subscriptions. Cancel your plan in subscription settings first."))
    }.confirmationDialog(
      T("Sign out on this device?"), isPresented: $confirm, titleVisibility: .visible
    ) {
      Button(T("Sign out"), role: .destructive) { Task { await store.signOut() } }
    } message: {
      Text(
        T("Private offline downloads will be removed. Your cloud library and conversations will remain.")
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
        Text(T("Tell us which paper or AI response concerns you and why. Reports are private and reviewed by our team."))
        TextEditor(text: $reason).frame(minHeight: 160).accessibilityLabel(T("Report details"))
        if !error.isEmpty { Text(T(error)).foregroundColor(.red) }
        Button(T(sending ? "Sending…" : "Send report")) { Task {
          sending = true
          do { _ = try await store.json("/api/reports", method: "POST", body: ["context": store.reportContext, "reason": reason]); dismiss() }
          catch { self.error = error.localizedDescription }
          sending = false
        } }.disabled(sending || reason.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
      }.navigationTitle(T("Report content")).toolbar { Button(T("Cancel")) { dismiss() } }
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
      if readers.isEmpty { Text(T("You have no blocked readers.")) }
      ForEach(readers, id: \.self) { reader in
        HStack {
          Text(reader["name"] ?? "Reader")
          Spacer()
          Button(T("Unblock")) { Task {
            do { _ = try await store.json("/api/blocks/\(reader["id"] ?? "")", method: "DELETE"); await load() }
            catch { store.error = error.localizedDescription }
          } }
        }
      }
    }.navigationTitle(T("Blocked readers")).task { await load() }
  }
}
struct NativeCreditRules: View {
  let credits:ReadingCredits
  var body: some View {
    Text(T("Shared papers earn {reward} credits once approved and published. Duplicate papers earn no extra credits. Up to {limit} credits per day.",["reward":String(credits.policy.publication),"limit":String(credits.policy.rewardPerDay)]))
    Text(T("Private PDFs cost 1 credit per page; other files cost 1 credit. Credits never expire."))
  }
}
struct NativeCreditSection: View {
  @EnvironmentObject var store:ReadingStore
  let names=["welcome":"Welcome credits","private_import":"Private import","unused_reservation":"Unused reservation","failed_import":"Import refund","public_reward":"Public contribution","subscription":"Monthly plan credits","purchase_refund":"Purchase refund"]
  var body: some View {
    Group {
      if let credits=store.credits,credits.enabled {
        Section(T("Reading credits")) {
          HStack(alignment:.firstTextBaseline) {Text(String(credits.balance)).font(.largeTitle.bold()).foregroundStyle(ideaGradient);Text(T("Available credits")).foregroundColor(.secondary)}
          if credits.held>0 {Text(T("Reserved for imports")+": \(credits.held)").foregroundColor(.secondary)}
          NativeCreditRules(credits:credits).font(.footnote)
          DisclosureGroup(T("Credit history")) {
            ForEach(Array(credits.history.enumerated()),id:\.offset) { _, entry in
              HStack {VStack(alignment:.leading) {Text(T(names[entry.kind] ?? entry.kind));Text(Date(timeIntervalSince1970:entry.created/1000),style:.date).font(.caption).foregroundColor(.secondary)};Spacer();Text((entry.delta>0 ? "+":"")+String(entry.delta)).monospacedDigit()}
            }
          }
        }
      }
    }.task {await store.loadCredits()}
  }
}
struct NativeSharingOptions: View {
  @EnvironmentObject var store:ReadingStore
  @Environment(\.dismiss) var dismiss
  var body: some View {
    NavigationView {
      Form {
        Section(T("Paper sharing")) {
          Picker(T("Visibility"),selection:$store.sharedImports) {
            Text(T("Shared reading room")).tag(true)
            Text(T("Only me")).tag(false)
          }.pickerStyle(.segmented)
          Text(T("Shared after source and community review."))
          Text(T("Share your own work or papers you have permission to publish.")).foregroundColor(.secondary)
        }
        NativeCreditSection()
        Section(T("Files & privacy")) {
          Text(T("Your chats and notes stay private."))
          Text(T("PDF and image recognition uses Mathpix. Word and text files are converted on the server."))
        }
      }.navigationTitle(T("Sharing & credits")).navigationBarTitleDisplayMode(.inline).toolbar {Button(T("Done")){dismiss()}}
    }
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
              T(["import","attachment"].contains(job.kind) ? "Conversion requests" : "Your requests"),
              systemImage: job.state == "completed" ? "checkmark.circle.fill" : "clock"
            ).font(.headline)
            if let title=job.title {Text(title).font(.headline)}
            Text(T(job.message)).font(.body).foregroundColor(.secondary)
            if let id = job.paperId, job.state == "completed" {
              NavigationLink(
                T("Open paper"),
                destination: NativePaper(
                  paper: store.papers.first { $0.id == id }
                    ?? ResearchPaper(id: id, title: "Your paper")))
            }
            if job.state == "failed" {
              if job.canUpload==true {NativePDFRecovery(recoveryJobId:job.id,shared:job.sharing=="shared")}
              if let source=job.source,source.hasPrefix("https://"),let url=URL(string:source) {Link(T("Open source"),destination:url)}
              Button(T("Try again")) {
                Task {
                  do {
                    let cost=job.creditCost ?? 0
                    guard let limit=try await store.authorizeImport(shared:cost==0,pdf:false,amount:cost) else {return}
                    _ = try await store.json("/api/jobs/\(job.id)/retry", method: "POST", body: ["creditLimit":limit])
                    await store.loadJobs()
                  } catch { store.error = error.localizedDescription }
                }
              }
            }
          }.padding(.vertical, 10)
        }
      }.navigationTitle(T("Your requests")).toolbar { Button(T("Done")) { dismiss() } }
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
  var initialLanguage:String? = nil
  @State private var reading:AlignedReading?
  @State private var readLanguage="zh-Hans"
  @State private var readingMode="original"
  @State private var translationPending=false
  @State private var translationTask:Task<Void,Never>?
  @State private var readingNotice=""
  @ScaledMetric(relativeTo: .body) private var readingScale: Double = 1
  @State private var document: ReaderDocument?
  @State private var quote = ""
  @State private var discussion = false
  @State private var paragraph = ""
  @State private var shareURL: URL?
  @State private var sharing = false
  @State private var readingTools = false
  @State private var languages = false
  @State private var watchNotice: String?
  @State private var watchProse = ""
  var body: some View {
    VStack(spacing: 0) {
      if let document = document {
        VStack(spacing:6) {
          HStack {
            Menu {ForEach(UILanguage.choices.filter{$0.0 != document.paper.language},id:\.0) {code,name in
              Button(name){readLanguage=code;readingMode="interlaced";Task{await refreshReading()}}
            }} label:{Label(UILanguage.choices.first{$0.0==readLanguage}?.1 ?? readLanguage,systemImage:"character.bubble").font(.subheadline.bold())}
            Spacer()
            if readingMode != "original",reading?.complete != true {
              Button(T("Fetch remaining translation")){translationTask=Task{await fetchReading()}}.font(.caption).disabled(translationPending)
            }
          }
          Picker(T("Reading view"),selection:$readingMode){Text(T("Original")).tag("original");Text(T("Translation")).tag("translation");Text(T("Interlaced")).tag("interlaced")}.pickerStyle(.segmented)
          if readingMode != "original" {HStack {Text(T("AI translation")+" · "+(reading.map{"\($0.translated)/\($0.total)"} ?? T("Connect to fetch available languages.")));Spacer();if translationPending {ProgressView()}}.font(.caption).foregroundStyle(.secondary)}
          if !readingNotice.isEmpty {Text(T(readingNotice)).font(.caption).foregroundStyle(.secondary)}
        }.padding(.horizontal,14).padding(.vertical,6)
        NativeDocument(
          document: document, size: store.readingSize * readingScale, dark: scheme == .dark,
          quote: $quote, reading:reading,mode:readingMode,onParagraph:{q,id in quote=q;paragraph=id;discussion=true},onSelection:{_ in paragraph=""}, onWatchProse:{watchProse=$0})
      } else {
        ProgressView(T("Opening your paper…")).font(.title3).frame(
          maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .navigationTitle(document?.paper.title ?? paper.title).navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .navigationBarTrailing) {
        Button {
          store.readingSize = min(34, store.readingSize + 1)
          store.objectWillChange.send()
        } label: {
          Image(systemName: "textformat.size")
        }.accessibilityLabel(T("Increase reading text size"))
        Menu {
          Button(T(store.isDownloaded(paper.id) ? "Unpin offline copy" : "Keep offline")) {
            if let document = document {
              do { try store.toggleDownload(document) } catch {
                store.error = error.localizedDescription
              }
            }
          }
          Button(T("Smaller text")) {
            store.readingSize = max(15, store.readingSize - 1)
            store.objectWillChange.send()
          }
          Button(T("Export Markdown")) {
            guard let text = document?.paper.mmd else { return }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(
              "paper-\(paper.id).mmd")
            do {
              try text.write(to: url, atomically: true, encoding: .utf8)
              shareURL = url
              sharing = true
            } catch { store.error = error.localizedDescription }
          }
          Button(T("Read in another language")) { readingMode = "interlaced" }
          #if !targetEnvironment(macCatalyst)
          if UIDevice.current.userInterfaceIdiom == .phone, let document, document.owner == "public", document.paper.visibility == "public" {
            Button {
              guard let excerpt = PaperWatchExcerpt.make(id: paper.id, title: document.paper.title,
                authors: document.paper.authors ?? "", markdown: "",
                selection: quote.isEmpty ? watchProse : quote, isPublic: true) else {
                watchNotice = "Select a short text passage to send. Equations and figures stay in the full reader."
                return
              }
              do {
                try WatchSender.shared.save(excerpt)
                watchNotice = "Excerpt queued. Open OnlyIdeas on your paired Apple Watch to read it offline."
              } catch { watchNotice = error.localizedDescription }
            } label: { Label(T("Send excerpt to Watch"), systemImage: "applewatch") }
          }
          #endif
          Button(T("Notes, guides & translation")) { readingTools = true }
          Button(T("Discuss this paper")) { paragraph="";quote="";discussion = true }
        } label: {
          Image(systemName: "ellipsis.circle")
        }.accessibilityLabel(T("Reading options"))
      }
    }
    .safeAreaInset(edge: .bottom) {
      if !quote.isEmpty {
        Button {
          discussion = true
        } label: {
          Label(T("Discuss selection"), systemImage: "text.bubble").font(.headline).padding(14).frame(
            maxWidth: .infinity
          ).background(.regularMaterial)
        }
      }
    }
    .task {
      readLanguage=initialLanguage ?? (paper.language == "zh-Hans" ? "en":"zh-Hans")
      if initialLanguage != nil {readingMode="interlaced"}
      document = store.cachedPaper(paper.id)
      reading=document?.readings?[readLanguage]
      do { document = try await store.loadPaper(paper, refresh: true) } catch {
        if Task.isCancelled { return }
        if store.cachedPaper(paper.id) == nil { document = nil; store.error = error.localizedDescription }
      }
      await refreshReading()
    }
    .onDisappear {translationTask?.cancel();translationTask=nil}
    #if DEBUG
    .onReceive(NotificationCenter.default.publisher(for:Notification.Name("OnlyIdeas.QA.ReaderMode"))) {event in
      if let mode=event.object as? String,["original","translation","interlaced"].contains(mode){readingMode=mode}
    }
    #endif

    .sheet(isPresented: $readingTools) {
      if let document = document { NativeReadingTools(document: document,selectedQuote:quote) }
    }
    .sheet(isPresented: $discussion) {
      NativeDiscussion(paper: document?.paper ?? paper, quote: quote, paragraphId:paragraph)
    }
    .sheet(isPresented: $sharing) { if let shareURL = shareURL { NativeShare(items: [shareURL]) } }
    .alert("Apple Watch", isPresented: Binding(get: { watchNotice != nil }, set: { if !$0 { watchNotice = nil } })) {
      Button(T("OK")) { watchNotice = nil }
    } message: { Text(T(watchNotice ?? "")) }
  }
  func refreshReading() async {
    guard let document else {return}
    let language=readLanguage
    reading=store.cachedPaper(paper.id)?.readings?[language]
    do {let result=try await store.loadReading(document,language:language);if readLanguage==language {reading=result;readingNotice=""}}
    catch {if readLanguage==language && reading==nil {readingNotice="Connect to fetch available languages."}}
  }
  func fetchReading() async {
    guard store.account != nil else {await store.signIn();return}
    guard !translationPending else {return}
    let language=readLanguage;translationPending=true;defer{translationPending=false}
    do {
      let response=try await store.json("/api/papers/\(paper.id)/assist",method:"POST",body:["kind":"translation","language":language])
      let id=(response["job"] as? [String:Any])?["id"] as? String ?? ""
      for _ in 0..<120 {
        await refreshReading();await store.loadJobs()
        if store.jobs.first(where:{$0.id==id})?.state=="failed" {readingNotice="Translation failed. Open Your requests to retry.";break}
        if reading?.complete==true || Task.isCancelled || readLanguage != language {break}
        try await Task.sleep(nanoseconds:3_000_000_000)
      }
    }catch{readingNotice=error.localizedDescription}
  }

}
struct NativeDocument: UIViewRepresentable {
  let document: ReaderDocument
  let size: Double
  let dark: Bool
  @Binding var quote: String
  var reading:AlignedReading? = nil
  var mode:String = "original"
  var onParagraph:((String,String)->Void)? = nil
  var onSelection:((String)->Void)? = nil
  var onWatchProse:((String)->Void)? = nil
  func makeCoordinator() -> Coordinator { Coordinator(self) }
  func makeUIView(context: Context) -> WKWebView {
    let c = WKWebViewConfiguration()
    c.userContentController.add(context.coordinator, name: "onlyideas")
    let view = WKWebView(frame: .zero, configuration: c)
    view.navigationDelegate = context.coordinator
    view.isOpaque = false
    view.backgroundColor = .clear
    view.scrollView.isDirectionalLockEnabled = true
    view.scrollView.alwaysBounceHorizontal = false
    view.scrollView.showsHorizontalScrollIndicator = false
    #if DEBUG
      if #available(iOS 16.4, *) { view.isInspectable = true }
    #endif

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
      let identity = parent.document.paper.id + (parent.document.paper.revision ?? "") + (parent.reading.map{"\($0.language):\($0.translated)"} ?? "")
      if revision != identity {
        var data: [String: Any] = [
          "mmd": parent.document.paper.mmd ?? "", "figures": parent.document.figures,
          "attribution":[parent.document.paper.license,parent.document.paper.provenance?.licenseUrl,parent.document.paper.provenance?.changes].compactMap{$0}.filter{$0 != "private"}.joined(separator:" · "),
          "fontSize": parent.size, "dark": parent.dark, "language":parent.document.paper.language ?? "en", "comments":parent.onParagraph != nil, "commentLabel":T("Discuss paragraph"),
        ]
        data["mode"]=parent.mode
        data["labels"]=["source":UILanguage.choices.first{$0.0==parent.document.paper.language}?.1 ?? "Original","translation":(UILanguage.choices.first{$0.0==parent.reading?.language}?.1 ?? "")+" · "+T("AI translation"),"partial":T("Remaining passages use the original.")]
        if let reading=parent.reading,let bytes=try? JSONEncoder().encode(reading),let value=try? JSONSerialization.jsonObject(with:bytes){data["reading"]=value}
        if let bytes = try? JSONSerialization.data(withJSONObject: data),
          let json = String(data: bytes, encoding: .utf8)
        {
          webView.evaluateJavaScript("window.OnlyIdeasRender && window.OnlyIdeasRender(\(json))") {
            _, _ in
          }
          revision = identity
        }
      }
      webView.evaluateJavaScript("window.OnlyIdeasMode && window.OnlyIdeasMode(\(String(data:try! JSONEncoder().encode(parent.mode),encoding:.utf8)!))")
      webView.evaluateJavaScript(
        "window.OnlyIdeasStyle && window.OnlyIdeasStyle(\(parent.size),\(parent.dark ? "true":"false"))"
      )
    }
    func userContentController(
      _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
      if let data = message.body as? [String: Any], let prose = data["watchProse"] as? String { parent.onWatchProse?(prose) }
      if let data = message.body as? [String: Any], let quote = data["quote"] as? String {
        parent.quote = quote
        if data["action"] as? String == "paragraph", let id = data["paragraphId"] as? String { parent.onParagraph?(quote,id) } else { parent.onSelection?(quote) }
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
  var paragraphId:String = ""
  @State private var comments: [PaperComment] = []
  var itemReference:String? = nil
  var commentsPath:String {itemReference.map{"/api/items/\($0)/comments"} ?? "/api/papers/\(paper.id)/comments"}
  @State private var draft = ""
  @State private var sending = false
  @State private var report: PaperComment?
  @State private var reason = ""
  @State private var acceptedTerms = false
  @State private var scrollRequest = 0
  func load(scrollToBottom: Bool = false) async {
    do {
      let r = try await store.json(commentsPath)
      comments = try store.decoded([PaperComment].self, r["comments"] ?? []).filter { paragraphId.isEmpty || $0.paragraphId == paragraphId }
    } catch { store.error = error.localizedDescription }
    if scrollToBottom { scrollRequest += 1 }
  }
  var body: some View {
    NavigationView {
      ScrollViewReader { proxy in
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
              if comment.pending == true { Text(T("Waiting for community review")).font(.caption).foregroundColor(.secondary) }
              if comment.canDelete == true {
                Button(T("Delete"), role: .destructive) {
                  Task {
                    do {
                      _ = try await store.json("/api/comments/\(comment.id)", method: "DELETE")
                      await load()
                    } catch { store.error = error.localizedDescription }
                  }
                }
              } else {
                Button(T("Report")) { report = comment }
                Button(T("Block reader"), role: .destructive) { Task {
                  do { _ = try await store.json("/api/comments/\(comment.id)/block", method: "POST", body: [:]); await load() }
                  catch { store.error = error.localizedDescription }
                } }
              }
            }.padding(.vertical, 8)
          }
          if comments.isEmpty {
            Text(T("What caught your attention? Leave the first thought.")).font(.title3)
              .foregroundColor(.secondary)
          }
          if paper.visibility == "public" {
            Toggle(T("I accept the Community Terms"), isOn: $acceptedTerms)
            Link(T("Read Community Terms"), destination: URL(string: "https://lachlan.lazying.art/OnlyIdeasApp/terms.html")!)
            Text(T("Public comments are reviewed before other readers can see them.")).font(.footnote).foregroundColor(.secondary)
          }
          TextEditor(text: $draft).font(.body).frame(height: 130)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2)))
            .accessibilityLabel(T("Your comment"))
          Button {
            Task { await post() }
          } label: {
            Label(T("Post thought"), systemImage: "paperplane").font(.headline).padding(.vertical, 8)
              .frame(maxWidth: .infinity)
          }.buttonStyle(.borderedProminent).disabled(
            draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sending || (paper.visibility == "public" && !acceptedTerms))
          Color.clear.frame(height: 1).id("discussion-bottom")
        }.padding(14)
      }.onChange(of: scrollRequest) { _ in proxy.scrollTo("discussion-bottom", anchor: .bottom) }
        .navigationTitle(T("Discussion")).toolbar { Button(T("Done")) { dismiss() } }.task { await load(scrollToBottom: true) }
        .sheet(item: $report) { comment in
          NavigationView {
            Form {
              Text(T("What should we review?")).font(.headline)
              TextEditor(text: $reason).font(.body).frame(height: 150)
              Button(T("Send report")) {
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
            }.navigationTitle(T("Report comment")).toolbar { Button(T("Cancel")) { report = nil } }
          }
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
        commentsPath, method: "POST",
        body: [
          "text": draft, "quote": quote, "paragraphId":paragraphId, "id": UUID().uuidString.lowercased(),
          "revision": paper.revision ?? "", "acceptTerms": acceptedTerms,
        ])
      draft = ""
      await load(scrollToBottom: true)
    } catch { store.error = error.localizedDescription }
  }
}

struct NativeReadingTools: View {
  @EnvironmentObject var store: ReadingStore
  @Environment(\.dismiss) var dismiss
  let document: ReaderDocument
  var selectedQuote:String = ""
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
        Section(T("Private notes")) {
          TextEditor(text: $notes).font(.title3).frame(minHeight: 160).accessibilityLabel(
            T("Private notes"))
          Button(T("Save notes")) { Task { await saveNotes() } }.disabled(pending)
        }
        Section {NavigationLink(T("Translate a paragraph or sentence")){NativePieceTranslation(document:document,selectedQuote:selectedQuote)}}
        Section(T("Read in another way")) {
          Picker(T("Language"), selection: $language) {
            ForEach(languages, id: \.0) { value in Text(value.1).bold().tag(value.0) }
          }
          Picker(T("Passage"), selection: $section) {
            Text(T("Whole paper")).tag("")
            ForEach(document.paper.sections ?? []) { value in Text(value.title).tag(value.id) }
          }
          Button(T("Create a reading guide")) { Task { await assist("digest") } }.disabled(pending)
          Button(T("Translate")) { Task { await assist("translation") } }.disabled(pending)
          Text(
            T("AI generated text can be wrong. Check it against the original paper. Requests use your shared model allowance.")
          ).font(.body).foregroundColor(.secondary)
          if !notice.isEmpty { Text(T(notice)).font(.body).foregroundColor(accent) }
        }
        Section(T("Saved guides and translations")) {
          ForEach(artifacts) { artifact in
            NavigationLink(destination: NativeArtifact(document: document, artifact: artifact)) {
              VStack(alignment: .leading, spacing: 6) {
                Text(T(artifact.kind == "digest" ? "Reading guide" : "Translation")).font(.headline)
                Text(languages.first { $0.0 == artifact.language }?.1 ?? artifact.language).font(
                  .body.weight(.bold))
              }.padding(.vertical, 6)
            }
          }
          Button(T("Refresh results")) { Task { await loadArtifacts() } }
        }
      }.navigationTitle(T("Reading tools")).toolbar { Button(T("Done")) { dismiss() } }
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
    if artifact.kind == "translation" {NativePaper(paper:document.paper,initialLanguage:artifact.language)} else {
    VStack(spacing: 0) {
      Text(T("AI generated ·") + " " + artifact.model).font(.body).foregroundColor(.secondary).padding()
      NativeDocument(
        document: derived, size: store.readingSize * readingScale, dark: scheme == .dark,
        quote: $quote)
    }.navigationTitle(artifact.kind == "digest" ? "Reading guide" : "Translation")
      .navigationBarTitleDisplayMode(.inline)
    }
  }
}

struct NativePhotoPicker: UIViewControllerRepresentable {
  var picked:(Data?)->Void
  func makeCoordinator()->Coordinator { Coordinator(picked) }
  func makeUIViewController(context:Context)->PHPickerViewController {
    var config=PHPickerConfiguration();config.filter = .images;config.selectionLimit=1
    let picker=PHPickerViewController(configuration:config);picker.delegate=context.coordinator;return picker
  }
  func updateUIViewController(_ controller:PHPickerViewController,context:Context) {}
  final class Coordinator:NSObject,PHPickerViewControllerDelegate {
    let picked:(Data?)->Void
    init(_ picked:@escaping(Data?)->Void){self.picked=picked}
    func picker(_ picker:PHPickerViewController,didFinishPicking results:[PHPickerResult]) {
      guard let provider=results.first?.itemProvider else { picked(nil);return }
      provider.loadObject(ofClass:UIImage.self) { object,_ in
        let bytes=(object as? UIImage)?.jpegData(compressionQuality:0.9)
        DispatchQueue.main.async { self.picked(bytes) }
      }
    }
  }
}

struct NativeLanguages: View {
  @EnvironmentObject var store:ReadingStore
  @Environment(\.dismiss) var dismiss
  let document:ReaderDocument
  @State private var artifacts:[ReadingArtifact]=[]
  @State private var selected:ReadingArtifact?
  @State private var requested=""
  @State private var requestedJob=""
  @State private var notice=""
  @State private var signIn=false
  var body: some View {
    NavigationView {
      List {
        Section { Text(T("Translations keep the original equations and figures. Existing work is reused across readers.")).font(.subheadline).foregroundColor(.secondary) }
        if !notice.isEmpty { Section {Text(T(notice)).font(.body)} }
        ForEach(UILanguage.choices,id:\.0) { code,name in
          Button { Task { await choose(code) } } label:{
            HStack {Text(name).bold();Spacer();if artifacts.contains(where:{$0.language==code}){Image(systemName:"checkmark.circle.fill").foregroundColor(accent)}else if requested==code{ProgressView()}else{Image(systemName:"arrow.down.circle").foregroundColor(accent)}}.padding(.vertical,6)
          }.buttonStyle(.plain)
        }
      }.navigationTitle(T("Read in another language")).navigationBarTitleDisplayMode(.inline).toolbar{Button(T("Done")){dismiss()}}
    }.sheet(item:$selected) { value in NavigationView {NativeArtifact(document:document,artifact:value).toolbar{Button(T("Done")){selected=nil}}} }
    .sheet(isPresented:$signIn){NativeSignIn().environmentObject(store)}
    .task { while !Task.isCancelled {await load();try? await Task.sleep(nanoseconds:3_000_000_000)} }
  }
  func load() async {
    do {let result=try await store.json("/api/papers/\(document.paper.id)/artifacts");artifacts=try store.decoded([ReadingArtifact].self,result["artifacts"] ?? []).filter{$0.kind=="translation"&&($0.sectionId ?? "").isEmpty&&($0.segmentId ?? "").isEmpty}
      if let ready=artifacts.first(where:{$0.language==requested}){requested="";requestedJob="";notice="Ready";selected=ready}
      else if !requestedJob.isEmpty {
        await store.loadJobs()
        if store.jobs.first(where:{$0.id==requestedJob})?.state == "failed" {requested="";requestedJob="";notice="Translation failed. Open Your requests to retry."}
      }
    }catch{if artifacts.isEmpty{notice="Connect to fetch available languages."}}
  }
  func choose(_ code:String) async {
    if let ready=artifacts.first(where:{$0.language==code}) {selected=ready;return}
    guard store.account != nil else {signIn=true;return}
    do { let result=try await store.json("/api/papers/\(document.paper.id)/assist",method:"POST",body:["kind":"translation","language":code]);requestedJob=(result["job"] as? [String:Any])?["id"] as? String ?? "";requested=code;notice="Translation requested. Existing work is reused.";await load() }
    catch {notice=error.localizedDescription}
  }
}


struct NativeSubscriptionSection:View {
  @EnvironmentObject var store:ReadingStore
  var body:some View {
    Group {
      if let catalog=store.subscriptionCatalog {
        Section(T("Monthly plans")) {
          Text(T("Existing papers and cached translations are free to read. Plans cover new fetching and transcription.")).font(.subheadline).foregroundColor(.secondary)
          if let quota=catalog.quota,quota.enabled {
            Text(quota.unlimited ? T("Unlimited owner allowance"):T("{pages} transcription pages and {fetches} fetches remaining",["pages":String(quota.remainingPages),"fetches":String(quota.remainingFetches)])).font(.subheadline.bold())
            if !quota.unlimited {Text(T("Renews on {date}",["date":Date(timeIntervalSince1970:quota.ends/1000).formatted(date:.abbreviated,time:.omitted)])).font(.caption).foregroundColor(.secondary)}
          }
          let available=catalog.enabled && catalog.providers.apple
          if !available {Text(T("Subscriptions are coming soon. You can keep reading for free.")).font(.subheadline)}
          if available && !catalog.canSubscribe {Text(T("Manage your plan in the store where you subscribed.")).font(.subheadline)}
          ForEach(catalog.plans) { plan in
            if let product=store.subscriptionProducts.first(where:{$0.id==plan.apple}),available {
              VStack(alignment:.leading,spacing:8) {
                HStack {Text(T(plan.name)).font(.headline);Spacer();Text(T("{price} / month",["price":product.displayPrice])).font(.headline)}
                Text(T("{pages} transcription pages · {fetches} new-paper fetches per month",["pages":String(plan.pages ?? plan.credits),"fetches":String(plan.fetches ?? 0)])).font(.subheadline.bold())
                if store.trialProducts.contains(product.id) {Text(T("7 days free, then {price} per month. Trial includes 50 pages and 10 fetches. Cancel before it ends to avoid payment.",["price":product.displayPrice])).font(.subheadline)}
                Text(T("{credits} credits each month · {messages} agent messages daily",["credits":String(plan.credits),"messages":String(plan.agentTurns)])).font(.subheadline)
                Button(T(catalog.plan==plan.id ? "Current plan":store.requestedPlanID==product.id ? "Continue":store.trialProducts.contains(product.id) ? "Start 7-day free trial":"Subscribe")) {Task {await store.purchase(product)}}
                  .buttonStyle(.borderedProminent).disabled(store.purchaseBusy || !catalog.canSubscribe)
              }.padding(.vertical,6)
            } else {
              VStack(alignment:.leading,spacing:8) {
                Text(T(plan.name)).font(.headline)
                Text(T("Planned price: {price} / month",["price":"US$"+(plan.targetUSD ?? "—")])).font(.subheadline.bold())
                Text(T("{pages} transcription pages · {fetches} new-paper fetches per month",["pages":String(plan.pages ?? plan.credits),"fetches":String(plan.fetches ?? 0)])).font(.subheadline)
                Button(T("Coming soon")){}.buttonStyle(.bordered).disabled(true)
              }.padding(.vertical,6)
            }
          }
          if !available {Text(T("Eligible subscribers get a 7-day trial when plans become available.")).font(.footnote).foregroundColor(.secondary)}
          if available && store.subscriptionProducts.isEmpty {Text(T("Plans are currently unavailable in this store.")).foregroundColor(.secondary)}
          if let notice=store.purchaseNotice {Text(notice).font(.subheadline).accessibilityAddTraits(.updatesFrequently)}
          Button(T("Restore purchases")){Task {await store.restorePurchases()}}.disabled(store.purchaseBusy || !available)
          Link(T("Manage subscription"),destination:URL(string:"https://apps.apple.com/account/subscriptions")!)
          Text(T("Subscriptions renew monthly until canceled in store settings. Unused credits do not expire. Service limits apply.")).font(.footnote).foregroundColor(.secondary)
          HStack {Link(T("Privacy"),destination:URL(string:"https://lachlan.lazying.art/OnlyIdeasApp/privacy.html")!);Spacer();Link(T("Terms"),destination:URL(string:"https://lachlan.lazying.art/OnlyIdeasApp/terms.html")!)}.font(.footnote)
        }
      } else {
        Section(T("Monthly plans")) {
          Text(T("Existing papers and cached translations are free to read. Plans cover new fetching and transcription."))
          if let notice=store.purchaseNotice {Text(notice)} else {ProgressView()}
          Button(T("Try again")){Task {await store.loadSubscriptions()}}
        }
      }
    }.task {await store.loadSubscriptions()}
  }
}


struct ResearchDiscovery: View {
  @EnvironmentObject var store: ReadingStore
  @Binding var query:String
  var requests:()->Void
  @State private var source="all"
  @State private var discipline=""
  @State private var subdiscipline=""
  @State private var from=""
  @State private var to=""
  @State private var journal=""
  @State private var sort="latest"
  @State private var filters=false
  @State private var saved=false
  @State private var busy=false
  @State private var nextPage:Int?
  @State private var notice=""
  @State private var generation=UUID()
  @State private var taxonomy:[String:[ResearchDiscipline]]=[:]
  @State private var hits:[DiscoveryPaper]=[]
  @State private var selected:ResearchPaper?
  @State private var showPaper=false
  @State private var importing=""
  var parameters:[String:String] { ["source":source,"discipline":discipline,"subdiscipline":subdiscipline,"from":from,"to":to,"journal":journal,"sort":query.isEmpty ? "latest":sort,"q":query] }
  var signature:String { parameters.sorted{$0.key<$1.key}.map{$0.key+"="+$0.value}.joined(separator:"&") + String(saved) + (store.account?.id ?? "visitor") }
  var fields:[ResearchDiscipline] {taxonomy[source == "arxiv" ? "arxiv":"openalex"] ?? []}
  var children:[ResearchCategory] {fields.first{$0.id==discipline}?.children ?? []}
  var body:some View {
    VStack(alignment:.leading,spacing:12) {
      HStack {Text(T(query.isEmpty ? "Research for you":"Search research")).font(.title2.bold());Spacer();Button {filters.toggle()}label:{Image(systemName:"slider.horizontal.3").frame(width:44,height:44)}.accessibilityLabel(T("Filters"));Button {if store.account==nil {Task{await store.signIn()}}else{saved.toggle()}} label:{Image(systemName:saved ? "star.fill":"star").frame(width:44,height:44)}.accessibilityLabel(T("Saved"))}
      if filters {filterControls}
      Text(T("Tap a paper to fetch and convert it. Existing papers open immediately. Shared imports enter publication review.")).font(.caption).foregroundColor(.secondary)
      ForEach(hits) { hit in
        VStack(alignment:.leading,spacing:8) {
          Text(hit.metadata).font(.caption).foregroundColor(.secondary)
          Button {Task{await choose(hit)}}label:{Text(hit.title).font(.headline).multilineTextAlignment(.leading).foregroundColor(.primary).frame(maxWidth:.infinity,alignment:.leading)}.disabled(importing==hit.id)
          if let unavailable=hit.fetchUnavailable {Text(T(unavailable)).font(.caption).foregroundColor(.secondary)}
          Text(hit.authors).font(.caption).foregroundColor(.secondary).lineLimit(2)
          if let summary=hit.summary,!summary.isEmpty {Text(summary).font(.subheadline).lineLimit(3)}
          HStack {Text(hit.doi.map{"DOI "+$0} ?? hit.index ?? "").font(.caption2).foregroundColor(.secondary).lineLimit(1);Spacer();if let source=URL(string:hit.source) {Link(T("Source"),destination:source).font(.caption)}}
          Button {Task{await choose(hit)}}label:{Label(T(importing==hit.id ? "Adding your paper…":hit.paperId != nil ? "Open paper":"Fetch & read"),systemImage:"arrow.right")}.disabled(importing==hit.id)
          if hit.paperId==nil && hit.ref?.hasPrefix("r-") != false {NativePDFRecovery(researchId:hit.id,done:requests)}
          NativePaperActions(reference:hit.ref ?? "r-"+hit.id,title:hit.title)
        }.padding(14).background(Color(.secondarySystemGroupedBackground)).cornerRadius(14)
      }
      if !notice.isEmpty {Text(T(notice)).font(.subheadline).foregroundColor(.secondary);Button(T("Try again")){Task{await reset()}}}
      if busy {ProgressView(T("Finding research…")).padding(.vertical,8)}
      if let next=nextPage {Button(T("Load more")){Task{await load(next,generation)}}.disabled(busy).onAppear{if !busy&&notice.isEmpty {Task{await load(next,generation)}}}}
      if !busy&&hits.isEmpty&&notice.isEmpty {Text(T("No papers found. Try broader keywords or fewer filters.")).font(.subheadline).foregroundColor(.secondary)}
    }.task {if taxonomy.isEmpty {do{taxonomy=try store.decoded([String:[ResearchDiscipline]].self,await store.json("/api/discovery/taxonomy"))}catch{}}}
      .task(id:signature){await reset()}
      .background(NavigationLink(destination:NativePaper(paper:selected ?? ResearchPaper(id:"",title:"")),isActive:$showPaper){EmptyView()}.hidden())
  }
  var filterControls:some View {
    VStack(alignment:.leading,spacing:8) {
      Picker(T("Source"),selection:$source){Text(T("All research")).tag("all");Text("OpenAlex").tag("openalex");Text("arXiv").tag("arxiv")}.onChange(of:source){_ in discipline="";subdiscipline=""}
      Picker(T("Primary discipline"),selection:$discipline){Text(T("All disciplines")).tag("");ForEach(fields){Text($0.name).tag($0.id)}}.onChange(of:discipline){_ in subdiscipline=""}
      Picker(T("Secondary discipline"),selection:$subdiscipline){Text(T("All disciplines")).tag("");ForEach(children){Text($0.name).tag($0.id)}}.disabled(children.isEmpty)
      HStack {TextField(T("From year"),text:$from).keyboardType(.numberPad);TextField(T("To year"),text:$to).keyboardType(.numberPad)}.textFieldStyle(.roundedBorder)
      TextField(T("Journal"),text:$journal).textFieldStyle(.roundedBorder)
      Picker(T("Sort"),selection:$sort){Text(T("Relevance")).tag("relevance");Text(T("Newest first")).tag("latest")}
      Button(T("Clear filters")){source="all";discipline="";subdiscipline="";from="";to="";journal=""}
    }.font(.subheadline).padding(10).background(Color(.secondarySystemGroupedBackground)).cornerRadius(12)
  }
  func reset() async {let id=UUID();generation=id;busy=false;nextPage=nil;notice="";hits=[];if !query.isEmpty {try? await Task.sleep(nanoseconds:450_000_000)};guard !Task.isCancelled,generation==id else{return};await load(1,id)}
  func load(_ page:Int,_ id:UUID) async {
    guard !busy,generation==id else{return};busy=true
    defer{if generation==id {busy=false}}
    do {var params=parameters;params["page"]=String(page);var u=URLComponents();u.queryItems=params.map{URLQueryItem(name:$0.key,value:$0.value)}
      let r=try await store.json(saved ? "/api/saved":"/api/discovery?"+(u.percentEncodedQuery ?? ""));guard generation==id,!Task.isCancelled else{return}
      let incoming=try store.decoded([DiscoveryPaper].self,r["papers"] ?? []);if page==1 {hits=incoming}else{hits+=incoming.filter{p in !hits.contains{$0.id==p.id}}};nextPage=r["nextPage"] as? Int
      if let missing=r["unavailable"]as?[String],!missing.isEmpty {notice="Some research indexes are temporarily unavailable."}else if r["stale"]as?Bool==true {notice="Showing cached research results."}
    }catch{if generation==id && !Task.isCancelled {notice=error.localizedDescription}}
  }
  func choose(_ hit:DiscoveryPaper) async {
    if let id=hit.paperId ?? (hit.ref?.hasPrefix("r-")==false ? hit.ref:nil){selected=ResearchPaper(id:id,title:hit.title);showPaper=true;return}
    guard store.account != nil else {await store.signIn();return}
    importing=hit.id;defer{importing=""}
    do{let r=try await store.json("/api/discovery/import",method:"POST",body:["id":hit.id,"sharing":"shared"]);if let id=r["paperId"]as?String {selected=ResearchPaper(id:id,title:hit.title);showPaper=true}else{await store.loadJobs();requests()}}catch{store.error=error.localizedDescription;await store.loadJobs();requests()}
  }
}
struct NativePaperActions:View {
 @EnvironmentObject var store:ReadingStore
 let reference:String;let title:String
 @State private var saved=false
 @State private var liked=false
 @State private var likes=0
 @State private var comments=0
 @State private var shareURL:URL?
 @State private var sharing=false
 @State private var discussion=false
 @State private var busy=false
 @State private var isPrivate=false
 var body:some View {
  HStack(spacing:4){action(saved ? "Saved":"Save",saved ? "star.fill":"star"){Task{await toggle("saved",!saved)}};action("Like",liked ? "heart.fill":"heart"){Task{await toggle("liked",!liked)}};action("Comment","bubble.right"){discussion=true};action("Share","square.and.arrow.up"){if shareURL != nil {sharing=true}else{store.error=T("Private papers can only be opened by their owner.")}}}.font(.caption).buttonStyle(.plain).disabled(busy)
   .task(id:reference+(store.account?.id ?? "")){await load()}
   .sheet(isPresented:$discussion,onDismiss:{Task{await load()}}){NativeDiscussion(paper:ResearchPaper(id:reference,title:title,visibility:isPrivate ? "private":"public"),quote:"",itemReference:reference)}
   .sheet(isPresented:$sharing){if let url=shareURL {NativeShare(items:[title,url])}}
 }
 func action(_ name:String,_ image:String,run:@escaping()->Void)->some View {Button(action:run){VStack(spacing:3){Image(systemName:image);Text(T(name)+(name=="Like" && likes>0 ? " \(likes)":name=="Comment" && comments>0 ? " \(comments)":"")).lineLimit(1).minimumScaleFactor(0.8)}.frame(maxWidth:.infinity,minHeight:44)}.accessibilityLabel(T(name))}
 func apply(_ r:[String:Any]){saved=r["saved"]as?Bool ?? false;liked=r["liked"]as?Bool ?? false;likes=r["likes"]as?Int ?? 0;comments=r["commentCount"]as?Int ?? 0;shareURL=(r["shareUrl"]as?String).flatMap(URL.init(string:));isPrivate=r["private"]as?Bool ?? false}
 func load()async {do{apply(try await store.json("/api/items/"+reference))}catch{}}
 func toggle(_ key:String,_ value:Bool)async {guard store.account != nil else{await store.signIn();return};busy=true;defer{busy=false};do{apply(try await store.json("/api/items/"+reference,method:"PUT",body:[key:value]))}catch{store.error=error.localizedDescription}}
}

struct SpaceEvent:Decodable,Identifiable {
 var id:String;var kind:String;var created:Double;var ref:String;var title:String
 var actor:String?;var read:Bool?;var active:Bool?;var message:String?;var state:String?;var paperId:String?
 var label:String {kind=="comment" ? "New comment":kind=="like" ? "New like":kind=="fetch" ? "Paper request":kind=="saved" ? (active==true ? "Saved":"Removed from Saved"):(active==true ? "Liked":"Removed from Liked")}
}
struct ReadingPreferences:Codable {
 var interests="";var discipline="";var language="en";var dailyEnabled=false;var dailyTime="09:00";var timezone="UTC";var commentAlerts=true;var likeAlerts=true
}
struct NativeReadingSpace:View {
 var initialSection="saved"
 @EnvironmentObject var store:ReadingStore
 @State private var tab="saved"
 @State private var papers:[DiscoveryPaper]=[]
 @State private var events:[SpaceEvent]=[]
 @State private var notice=""
 @State private var busy=false
 @State private var unread=0
 @State private var settings=false
 @State private var selected:ResearchPaper?
 @State private var showPaper=false
 @State private var requests=false
 private let tabs=[("saved","Saved"),("liked","Liked"),("inbox","Inbox"),("activity","Activity"),("daily","For you")]
 var body:some View {
  ScrollView {
   VStack(alignment:.leading,spacing:16) {
    if store.account == nil {
     Text(T("Sign in to keep your papers and conversations together."))
     Button(T("Sign in")){Task{await store.signIn()}}
    } else {
     sectionTabs
     if tab == "inbox" && events.contains(where:{$0.read == false}) {
      Button(T("Mark all read")){Task{await markRead(events.map(\.id))}}
     }
     if busy {ProgressView()}
     if !notice.isEmpty {
      Text(T(notice)).foregroundColor(.secondary)
      Button(T("Try again")){Task{await load()}}
     }
     ForEach(papers){p in paperCard(p)}
     ForEach(events){e in eventCard(e)}
     if !busy && notice.isEmpty && papers.isEmpty && events.isEmpty {
      Text(T(tab == "inbox" ? "No new notifications":tab == "activity" ? "Your reading activity will appear here.":"No papers here yet."))
       .foregroundColor(.secondary).padding(.vertical,32)
     }
    }
   }.padding(16)
  }
  .navigationTitle(T("Your space"))
  .toolbar{Button{settings=true}label:{Image(systemName:"slider.horizontal.3")}.accessibilityLabel(T("Interests & notifications")).disabled(store.account==nil)}
  .sheet(isPresented:$settings,onDismiss:{Task{await load()}}){NavigationView{NativeReadingPreferences()}.environmentObject(store)}
  .sheet(isPresented:$requests){NativeRequests().environmentObject(store)}
  .task(id:tab+(store.account?.id ?? "")){await load()}
  .onAppear{tab=initialSection}
  .onChange(of:initialSection){tab=$0}
  .onReceive(Timer.publish(every:30,on:.main,in:.common).autoconnect()){_ in if tab=="inbox" {Task{await load()}}}
  .onReceive(NotificationCenter.default.publisher(for:Notification.Name("OnlyIdeas.OpenSpace"))){_ in tab="daily"}
  .background(NavigationLink(destination:NativePaper(paper:selected ?? ResearchPaper(id:"",title:"")),isActive:$showPaper){EmptyView()}.hidden())
 }
 private var sectionTabs:some View {
  ScrollView(.horizontal,showsIndicators:false) {
   HStack {
    ForEach(tabs,id:\.0) { id,name in
     Button{tab=id}label:{
      Text(T(name)+(id=="inbox" && unread>0 ? " · \(unread)":""))
       .padding(.horizontal,14).padding(.vertical,9)
       .background(tab==id ? accent:Color(.secondarySystemGroupedBackground))
       .foregroundColor(tab==id ? .white:.primary).clipShape(Capsule())
     }
    }
   }
  }
 }
 private func paperCard(_ p:DiscoveryPaper)->some View {
  VStack(alignment:.leading,spacing:10) {
   Text(p.metadata).font(.caption).foregroundColor(.secondary)
   Button{Task{await choose(p)}}label:{Text(p.title).font(.headline).multilineTextAlignment(.leading).foregroundColor(.primary)}
   Text(p.authors).font(.caption).foregroundColor(.secondary)
   Button(T(p.paperId != nil || p.ref?.hasPrefix("r-")==false ? "Open paper":"Fetch & read")){Task{await choose(p)}}
   if p.paperId==nil && p.ref?.hasPrefix("r-") != false {NativePDFRecovery(researchId:p.id,done:{requests=true})}
   NativePaperActions(reference:p.ref ?? "r-"+p.id,title:p.title)
  }.padding(14).background(Color(.secondarySystemGroupedBackground)).cornerRadius(16)
 }
 private func eventCard(_ e:SpaceEvent)->some View {
  VStack(alignment:.leading,spacing:8) {
   HStack {
    Text(T(e.label)).font(.subheadline.bold())
    if e.read==false {Circle().fill(accent).frame(width:8,height:8)}
    Spacer()
    Text(Date(timeIntervalSince1970:e.created/1000),style:.date).font(.caption).foregroundColor(.secondary)
   }
   Text(e.title).font(.headline)
   if let actor=e.actor {Text(actor).font(.caption)}
   if let message=e.message {Text(T(message)).font(.subheadline).foregroundColor(.secondary)}
   if !e.ref.isEmpty {Button(T("Open paper")){Task{await openEvent(e)}}}
   if e.kind=="fetch" && e.paperId==nil {Button(T("Your requests")){requests=true}}
  }.padding(14).background(Color(.secondarySystemGroupedBackground)).cornerRadius(16)
 }
 func load() async {guard store.account != nil else{papers=[];events=[];return};let owner=store.account?.id,section=tab;busy=true;notice="";defer{busy=false};do{let r=try await store.json("/api/"+section);guard store.account?.id==owner,tab==section else{return};papers=try store.decoded([DiscoveryPaper].self,r["papers"] ?? []);events=try store.decoded([SpaceEvent].self,r["events"] ?? r["notifications"] ?? []);if let count=r["unread"]as?Int {unread=count;store.inboxUnread=count}}catch{notice=error.localizedDescription}}
 func markRead(_ ids:[String])async{do{_ = try await store.json("/api/inbox",method:"PUT",body:["ids":ids]);await load()}catch{notice=error.localizedDescription}}
 func choose(_ p:DiscoveryPaper)async{if let id=p.paperId ?? (p.ref?.hasPrefix("r-")==false ? p.ref:nil){selected=ResearchPaper(id:id,title:p.title);showPaper=true;return};do{let r=try await store.json("/api/discovery/import",method:"POST",body:["id":p.id,"sharing":"shared"]);if let id=r["paperId"]as?String{selected=ResearchPaper(id:id,title:p.title);showPaper=true}else{requests=true}}catch{notice=error.localizedDescription}}
 func openEvent(_ e:SpaceEvent)async{if e.read==false {await markRead([e.id])};if e.ref.hasPrefix("r-"){do{let r=try await store.json("/api/discovery/item/"+String(e.ref.dropFirst(2)));papers=[try store.decoded(DiscoveryPaper.self,r["paper"] ?? [:])]}catch{notice=error.localizedDescription}}else{selected=ResearchPaper(id:e.ref,title:e.title);showPaper=true}}
}
struct NativeReadingPreferences:View {
 @EnvironmentObject var store:ReadingStore
 @Environment(\.dismiss) var dismiss
 @State private var prefs=ReadingPreferences()
 @State private var fields:[ResearchDiscipline]=[]
 @State private var time=Date()
 @State private var notice=""
 @State private var ready=false
 var body:some View {Form {
  Section(T("Interests")){TextField(T("Topics you enjoy"),text:$prefs.interests);Picker(T("Primary discipline"),selection:$prefs.discipline){Text(T("All disciplines")).tag("");ForEach(fields){Text($0.name).tag($0.id)}};Picker(T("Preferred reading language"),selection:$prefs.language){ForEach(UILanguage.choices,id:\.0){code,name in Text(name).tag(code)}}}
  Section(T("Inbox")){Toggle(T("Comment notifications"),isOn:$prefs.commentAlerts);Toggle(T("Like notifications"),isOn:$prefs.likeAlerts);Text(T("Activity appears in your inbox when you open the app.")).font(.footnote).foregroundColor(.secondary)}
  Section(T("Daily reading reminder")){Toggle(T("Daily reading reminder"),isOn:$prefs.dailyEnabled);DatePicker(T("Daily time"),selection:$time,displayedComponents:.hourAndMinute);Text(TimeZone.current.identifier).font(.caption).foregroundColor(.secondary);Text(T("Open For you for papers matching your interests. Reminders do not download or convert papers.")).font(.footnote).foregroundColor(.secondary)}
  if !notice.isEmpty {Text(T(notice))}
  Button(T("Save preferences")){Task{await save()}}.disabled(!ready)
 }.navigationTitle(T("Interests & notifications")).toolbar{Button(T("Done")){dismiss()}}.task{do{let r=try await store.json("/api/preferences");prefs=try store.decoded(ReadingPreferences.self,r["preferences"] ?? [:]);let tax=try await store.json("/api/discovery/taxonomy");fields=try store.decoded([ResearchDiscipline].self,tax["openalex"] ?? []);let parts=prefs.dailyTime.split(separator:":").compactMap{Int($0)};if parts.count==2{time=Calendar.current.date(bySettingHour:parts[0],minute:parts[1],second:0,of:Date()) ?? Date()};ready=true}catch{notice=error.localizedDescription}}}
 func save()async{do{let c=Calendar.current.dateComponents([.hour,.minute],from:time);prefs.dailyTime=String(format:"%02d:%02d",c.hour ?? 9,c.minute ?? 0);prefs.timezone=TimeZone.current.identifier;let body=try JSONSerialization.jsonObject(with:JSONEncoder().encode(prefs));_ = try await store.json("/api/preferences",method:"PUT",body:body);let enabled=await ReadingReminder.configure(prefs);notice=prefs.dailyEnabled && !enabled ? "Preferences saved. Enable notifications in system settings for reminders.":"Preferences saved"}catch{notice=error.localizedDescription}}
}

struct NativePDFRecovery:View {
 @EnvironmentObject var store:ReadingStore
 var researchId:String? = nil
 var recoveryJobId:String? = nil
 var shared:Bool = true
 var done:()->Void = {}
 @State private var picker=false
 var body:some View {
  Button {if store.account==nil {Task{await store.signIn()}}else{picker=true}} label:{Label(T("Upload my PDF"),systemImage:"doc.badge.arrow.up")}
   .disabled(store.busy)
   .fileImporter(isPresented:$picker,allowedContentTypes:[.pdf]) {result in
    switch result {
     case .success(let url):Task{await store.importPDF(url,shared:shared,researchId:researchId,recoveryJobId:recoveryJobId);done()}
     case .failure(let error):store.error=error.localizedDescription
    }
   }
 }
}

struct NativePieceTranslation:View {
 @EnvironmentObject var store:ReadingStore
 let document:ReaderDocument
 var selectedQuote:String = ""
 @State private var paragraphs:[TranslationParagraph]=[]
 @State private var paragraph=""
 @State private var sentence=""
 @State private var language="zh-Hans"
 @State private var results:[ReadingArtifact]=[]
 @State private var pending=false
 @State private var notice=""
 var selected:TranslationParagraph? {paragraphs.first{$0.id==paragraph}}
 var segment:String {sentence.isEmpty ? paragraph:sentence}
 var ready:ReadingArtifact? {results.first{$0.kind=="translation"&&$0.language==language&&$0.segmentId==segment}}
 var body:some View {
  Form {
   Section {Text(T("Only missing pieces use the model. Saved translations are reused."))}
   Section {
    Picker(T("Language"),selection:$language){ForEach(UILanguage.choices,id:\.0){value in Text(value.1).tag(value.0)}}
    Picker(T("Paragraph"),selection:$paragraph){ForEach(paragraphs){p in Text(String(p.text.prefix(90))).tag(p.id)}}.onChange(of:paragraph){_ in sentence=""}
    Picker(T("Sentence"),selection:$sentence){Text(T("Entire paragraph")).tag("");ForEach(selected?.sentences ?? []){s in Text(String(s.text.prefix(90))).tag(s.id)}}
    if let p=selected {DisclosureGroup(T("This passage")){Text(sentence.isEmpty ? p.text : p.sentences.first{$0.id==sentence}?.text ?? "").textSelection(.enabled)}}
   }
   Section {
    if let artifact=ready {NavigationLink(T("Open translation")){NativeArtifact(document:document,artifact:artifact)}}
    else {Button(T("Translate this passage")){Task{await translate()}}.disabled(segment.isEmpty||pending)}
    if !notice.isEmpty {Text(T(notice))}
   }
  }.navigationTitle(T("Translate a paragraph or sentence")).navigationBarTitleDisplayMode(.inline)
   .task {do{let r=try await store.json("/api/papers/\(document.paper.id)/segments");paragraphs=try store.decoded([TranslationParagraph].self,r["segments"] ?? []);paragraph=(paragraphs.first{!selectedQuote.isEmpty&&$0.text.contains(String(selectedQuote.prefix(80)))} ?? paragraphs.first)?.id ?? "";await refresh()}catch{notice=error.localizedDescription}}
   .task {while !Task.isCancelled {try? await Task.sleep(nanoseconds:3_000_000_000);if !Task.isCancelled {await refresh()}}}
 }
 func refresh()async{do{let r=try await store.json("/api/papers/\(document.paper.id)/artifacts");results=try store.decoded([ReadingArtifact].self,r["artifacts"] ?? [])}catch{notice=error.localizedDescription}}
 func translate()async{guard store.account != nil else{await store.signIn();return};pending=true;defer{pending=false};do{let r=try await store.json("/api/papers/\(document.paper.id)/assist",method:"POST",body:["kind":"translation","language":language,"segmentId":segment]);let job=r["job"]as?[String:Any];notice=job?["state"]as?String=="failed" ? job?["message"]as?String ?? "" : "Translation requested. Existing work is reused.";await refresh();await store.loadJobs()}catch{notice=error.localizedDescription}}
}
