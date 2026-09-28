import AuthenticationServices
import CryptoKit
import Foundation
import Security
import StoreKit
import SwiftUI
import WebKit

struct ResearchPaper: Codable, Identifiable {
  var id: String
  var title: String
  var authors: String?
  var language: String?
  var category: String?
  var discipline:String?
  var subdiscipline:String?
  var year:String?
  var journal:String?
  var doi:String?
  var visibility: String?
  var mmd: String?
  var revision: String?
  var assets: [PaperAsset]?
  var sections: [PaperSection]?
}
struct ResearchCategory:Codable,Identifiable {var id:String;var name:String}
struct ResearchDiscipline:Codable,Identifiable {var id:String;var name:String;var children:[ResearchCategory]}
struct DiscoveryPaper:Codable,Identifiable {
 var id:String;var title:String;var authors:String;var source:String
 var fetchUnavailable:String?;var summary:String?;var pdfUrl:String?;var paperId:String?;var year:String?;var journal:String?;var doi:String?;var discipline:String?;var subdiscipline:String?;var index:String?;var ref:String?
 var metadata:String {[discipline,subdiscipline,year,journal].compactMap{$0}.filter{!$0.isEmpty}.joined(separator:" · ")}
}
func researchMatches(_ query:String,_ text:String)->Bool {
 let words=text.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:.current).components(separatedBy:CharacterSet.alphanumerics.inverted).filter{!$0.isEmpty}
 return query.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:.current).split(separator:" ").allSatisfy{term in
   let q=String(term);return words.contains{w in if w.contains(q){return true};guard q.count>=5,abs(q.count-w.count)<=1 else{return false};let a=Array(q),b=Array(w);var i=0,j=0,n=0;while i<a.count && j<b.count {if a[i]==b[j]{i+=1;j+=1}else{n+=1;if n>1{return false};if a.count>=b.count{i+=1};if b.count>=a.count{j+=1}}};return n+a.count-i+b.count-j<=1}
 }
}
struct ReadingArtifact: Codable, Identifiable {
  var sectionId:String?
  var id: String
  var text: String
  var kind: String
  var language: String
  var model: String
}
struct PaperSection: Codable, Identifiable {
  var id: String
  var title: String
}
struct PaperAsset: Codable { var path: String }
struct ReadingAccount: Codable {
  var id: String
  var name: String
  var login: String
}
struct Conversation: Codable, Identifiable {
  var id: String
  var title: String
}
struct FoundPaper: Codable, Identifiable {
  var id: String
  var title: String
  var authors: String
  var summary: String
  var year: String?
}
struct AgentAttachment: Codable, Identifiable {
  var id:String
  var name:String
  var state:String
  var paperId:String?
}
struct AgentMessage: Codable, Identifiable {
  var id: String
  var role: String
  var text: String
  var attachments:[AgentAttachment]?
  var papers: [FoundPaper]?
  var jobId: String?
}
struct ReaderDocument: Codable {
  var paper: ResearchPaper
  var figures: [String: String]
  var owner: String
  var pinned: Bool?
  var accessed: TimeInterval?
}
struct ReadingJob: Codable, Identifiable {
  var id: String
  var kind: String
  var state: String
  var message: String
  var paperId: String?
  var creditCost: Int?
}
struct ReadingCredits: Decodable {
  struct Policy: Decodable { var publication:Int; var rewardPerDay:Int }
  struct Entry: Decodable { var kind:String; var delta:Int; var created:Double }
  var enabled:Bool; var balance:Int; var held:Int; var maxPDF:Int
  var policy:Policy; var history:[Entry]
}
struct SubscriptionCatalog: Decodable {
  struct Plan: Decodable, Identifiable {var id:String;var name:String;var credits:Int;var agentTurns:Int;var apple:String;var google:String}
  struct Providers:Decodable {var apple:Bool;var google:Bool}
  var enabled:Bool;var accountToken:String?;var providers:Providers;var plans:[Plan];var plan:String?;var canSubscribe:Bool
}
struct PaperComment: Codable, Identifiable {
  var id: String
  var author: String
  var text: String
  var quote: String?
  var canDelete: Bool?
  var pending: Bool?
  var paragraphId:String?
}

@MainActor
final class ReadingStore: NSObject, ObservableObject,
  ASWebAuthenticationPresentationContextProviding, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding
{
  @Published var papers: [ResearchPaper] = []
  @Published var account: ReadingAccount?
  @Published var conversations: [Conversation] = []
  @Published var messages: [AgentMessage] = []
  @Published var jobs: [ReadingJob] = []
  @Published var conversationID: String?
  @Published var agentStatus = ""
  @Published var inboxUnread = 0
  @Published var error: String?
  @Published var busy = false
  @Published var attachmentBusy = false
  @Published var draftAttachments:[AgentAttachment] = []
  @Published var offline = false
  @Published var signingIn = false
  @Published var showSignIn = false
  @Published var showReport = false
  @Published var sharedImports = true
  @Published var credits:ReadingCredits?
  @Published var subscriptionCatalog:SubscriptionCatalog?
  @Published var subscriptionProducts:[Product]=[]
  @Published var purchaseBusy=false
  @Published var purchaseNotice:String?
  private var purchaseUpdates:Task<Void,Never>?
  private var purchaseIntents:Task<Void,Never>?
  @Published var requestedPlanID:String?
  @Published var creditPrompt:String?
  private var creditDecision:CheckedContinuation<Bool,Never>?
  var reportContext = ""
  private var appleFlow: (id: String, verifier: String)?
  private var appleController: ASAuthorizationController?
  @AppStorage("onlyideas.native.font") var readingSize: Double = 18
  private var warming: Task<Void, Never>?
  @AppStorage("onlyideas.native.language") var language = "system"
  @AppStorage("onlyideas.native.appearance") var appearance = "system"
  private var token: String?
  private var authentication: ASWebAuthenticationSession?
  private var origin:String {
    #if DEBUG
    if ProcessInfo.processInfo.arguments.contains("--onlyideas-space-qa"),let value=ProcessInfo.processInfo.environment["ONLYIDEAS_QA_ORIGIN"],let url=URL(string:value),url.scheme=="http",url.host=="127.0.0.1",url.port != nil {return value}
    #endif
    return "https://agent.onlyideas.art"
  }
  private lazy var network: URLSession = {
    #if DEBUG && targetEnvironment(macCatalyst)
    if let port = Int(ProcessInfo.processInfo.environment["ONLYIDEAS_QA_PROXY_PORT"] ?? ""), (1024...65535).contains(port) {
      let config=URLSessionConfiguration.default
      config.connectionProxyDictionary=["HTTPEnable":1,"HTTPProxy":"127.0.0.1","HTTPPort":port,"HTTPSEnable":1,"HTTPSProxy":"127.0.0.1","HTTPSPort":port]
      return URLSession(configuration:config)
    }
    #endif
    return .shared
  }()
  private let tokenAccount = "capacitor-storage_onlyideas.session.v1"
  private var folder: URL {
    var u = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("OnlyIdeasDownloads", isDirectory: true)
    try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? u.setResourceValues(values)
    return u
  }
  override init() {
    super.init()
    clearExports()
    if let data = keychainRead(tokenAccount),
      let value = try? JSONDecoder().decode(String.self, from: data)
    {
      token = value
    }
    if token != nil, let data = UserDefaults.standard.data(forKey: "onlyideas.native.account") {
      account = try? JSONDecoder().decode(ReadingAccount.self, from: data)
    }
    restoreLibrary()
    if #available(iOS 16.4, *) {
      purchaseIntents=Task { [weak self] in
        for await intent in PurchaseIntent.intents {
          guard !Task.isCancelled else {break}
          // A store request opens the signed-in plan screen. Checkout still
          // requires the reader's tap and the current app account binding.
          self?.requestedPlanID=intent.product.id
        }
      }
    }
    purchaseUpdates=Task { [weak self] in
      for await result in StoreKit.Transaction.updates {
        guard !Task.isCancelled else {break}
        do {try await self?.deliverPurchase(result)} catch {self?.purchaseNotice=error.localizedDescription}
      }
    }
  }
  deinit {purchaseUpdates?.cancel();purchaseIntents?.cancel()}
  private var scope: String { account?.id ?? "public" }
  private var libraryURL: URL { folder.appendingPathComponent("library-" + Data(SHA256.hash(data: Data(scope.utf8))).map { String(format: "%02x", $0) }.joined() + ".index") }
  private func restoreLibrary() {
    if let data = try? Data(contentsOf: libraryURL), let saved = try? JSONDecoder().decode([ResearchPaper].self, from: data) { papers = saved }
    else { papers = downloads().map(\.paper) }
  }
  private func persistLibrary() {
    try? JSONEncoder().encode(papers).write(to: libraryURL, options: [.atomic, .completeFileProtection])
  }
  private func keychainRead(_ account: String) -> Data? {
    var result: CFTypeRef?
    let q: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account,
      kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    return SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess ? result as? Data : nil
  }
  private func saveToken(_ value: String?) throws {
    let q: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: tokenAccount,
    ]
    if let value = value {
      let data = try JSONEncoder().encode(value)
      let status = SecItemUpdate(q as CFDictionary, [kSecValueData as String: data] as CFDictionary)
      if status == errSecItemNotFound {
        var insert = q
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(insert as CFDictionary, nil) == errSecSuccess else {
          throw failure(T("Could not save your secure session."))
        }
      } else if status != errSecSuccess {
        throw failure(T("Could not update your secure session."))
      }
    } else {
      SecItemDelete(q as CFDictionary)
    }
    warming?.cancel()
    token = value
  }
  func clearExports() {
    for url
      in (try? FileManager.default.contentsOfDirectory(
        at: FileManager.default.temporaryDirectory, includingPropertiesForKeys: nil)) ?? []
    where url.lastPathComponent.hasPrefix("paper-") && url.pathExtension == "mmd" {
      try? FileManager.default.removeItem(at: url)
    }
  }
  func failure(_ message: String) -> NSError {
    NSError(domain: "OnlyIdeas", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
  func request(
    _ path: String, method: String = "GET", body: Any? = nil, data: Data? = nil,
    headers: [String: String] = [:]
  ) async throws -> Data {
    #if DEBUG
      if ProcessInfo.processInfo.arguments.contains("--onlyideas-native-offline") {
        throw failure(T("Offline test"))
      }
    #endif
    guard let url = URL(string: origin + path) else { throw failure(T("Invalid request.")) }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.timeoutInterval = 65
    request.setValue("capacitor://localhost", forHTTPHeaderField: "Origin")
    request.setValue("native", forHTTPHeaderField: "X-OnlyIdeas-Client")
    var requestToken=token
    #if DEBUG
    if origin.hasPrefix("http://127.0.0.1:"){requestToken=ProcessInfo.processInfo.environment["ONLYIDEAS_QA_TOKEN"]}
    #endif
    if let token = requestToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    if let body = body {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    if let data = data { request.httpBody = data }
    for (k, v) in headers { request.setValue(v, forHTTPHeaderField: k) }
    let (bytes, response) = try await network.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      let value = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any]
      throw NSError(domain: "OnlyIdeasHTTP", code: (response as? HTTPURLResponse)?.statusCode ?? 0,
        userInfo: [NSLocalizedDescriptionKey: value?["error"] as? String ?? "Connection interrupted. Please try again."])
    }
    return bytes
  }
  func json(_ path: String, method: String = "GET", body: Any? = nil) async throws -> [String: Any]
  {
    try JSONSerialization.jsonObject(with: await request(path, method: method, body: body))
      as? [String: Any] ?? [:]
  }
  func decoded<T: Decodable>(_ type: T.Type, _ value: Any) throws -> T {
    try JSONDecoder().decode(type, from: JSONSerialization.data(withJSONObject: value))
  }
  func refresh() async {
    let current = token
    do {
      let session = try await json("/api/session")
      guard current == token else { return }
      if let user = session["user"] as? [String: Any] {
        account = try decoded(ReadingAccount.self, user)
        UserDefaults.standard.set(
          try JSONEncoder().encode(account), forKey: "onlyideas.native.account")
      } else if token != nil {
        try saveToken(nil)
        account = nil
        newConversation()
        conversations = []
        jobs = []
        clearPrivateDownloads()
        UserDefaults.standard.removeObject(forKey: "onlyideas.native.account")
      }
      let paperIdentity = token
      let result = try await json("/api/papers")
      guard paperIdentity == token else { return }
      papers = try decoded([ResearchPaper].self, result["papers"] ?? [])
      #if !targetEnvironment(macCatalyst)
      WatchSender.shared.reconcile(publicIDs: Set(papers.filter { $0.visibility == "public" }.map(\.id)))
      #endif
      persistLibrary()
      let available = Dictionary(papers.map { ($0.id, $0.visibility) }, uniquingKeysWith: { _, new in new })
      for saved in downloads() where available[saved.paper.id] != saved.paper.visibility { removeCached(saved.paper.id) }
      warming?.cancel()
      let candidates = Array(papers.prefix(3)), identity = token
      warming = Task { [weak self] in
        guard let self else { return }
        for paper in candidates {
          guard !Task.isCancelled, self.token == identity else { return }
          if let cached = self.cachedPaper(paper.id), cached.paper.revision == paper.revision,
             cached.paper.title == paper.title, cached.paper.visibility == paper.visibility { continue }
          _ = try? await self.loadPaper(paper, refresh: true)
        }
      }
      offline = false
      if account != nil {
        await loadConversations()
        await loadJobs(refreshLibrary: false)
      }
    } catch {
      offline = true
      let local = downloads()
      if !local.isEmpty {
        papers = local.map(\.paper)
      } else {
        self.error = error.localizedDescription
      }
    }
  }
  func signIn() async { showSignIn = true }
  func signInWithApple() async {
    guard !signingIn else { return }
    signingIn = true
    do {
      let verifier = Data((0..<32).map { _ in UInt8.random(in: 0...255) }).base64URLEncoded
      let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
      let result = try await json("/api/auth/apple/start", method: "POST", body: ["challenge": challenge])
      guard let flow = result["flow"] as? String, let nonce = result["nonce"] as? String else { throw failure(T("Could not start Apple sign-in.")) }
      appleFlow = (flow, verifier)
      let request = ASAuthorizationAppleIDProvider().createRequest()
      request.requestedScopes = [.fullName]
      request.nonce = nonce
      let controller = ASAuthorizationController(authorizationRequests: [request])
      controller.delegate = self
      controller.presentationContextProvider = self
      appleController = controller
      controller.performRequests()
    } catch { self.error = error.localizedDescription; signingIn = false }
  }
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
      .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
  }
  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    Task { @MainActor in
      defer { signingIn = false; appleFlow = nil; appleController = nil }
      do {
        guard let flow = appleFlow, let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let identityData = credential.identityToken, let identity = String(data: identityData, encoding: .utf8),
          let codeData = credential.authorizationCode, let code = String(data: codeData, encoding: .utf8)
        else { throw failure(T("Apple did not finish sign-in. Please try again.")) }
        let name = credential.fullName.map { PersonNameComponentsFormatter().string(from: $0) } ?? ""
        let result = try await json("/api/auth/apple/complete", method: "POST", body: ["flow": flow.id, "verifier": flow.verifier, "identityToken": identity, "code": code, "name": name])
        guard let token = result["token"] as? String else { throw failure(T("Could not save sign-in.")) }
        try saveToken(token)
        UserDefaults.standard.set(credential.user, forKey: "onlyideas.apple.user")
        showSignIn = false
        await refresh()
      } catch { self.error = error.localizedDescription }
    }
  }
  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    signingIn = false; appleFlow = nil; appleController = nil
    if (error as NSError).code != ASAuthorizationError.canceled.rawValue { self.error = error.localizedDescription }
  }
  func signInWithGitHub() async {
    showSignIn = false
    guard !signingIn else { return }
    signingIn = true
    do {
      let verifier = Data((0..<32).map { _ in UInt8.random(in: 0...255) }).base64URLEncoded
      let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
      let flow = try await json(
        "/api/auth/native/start", method: "POST", body: ["challenge": challenge])
      guard let urlText = flow["url"] as? String, let url = URL(string: urlText),
        url.host == "agent.onlyideas.art", let id = flow["flow"] as? String
      else { throw failure(T("Could not start sign-in.")) }
      authentication = ASWebAuthenticationSession(url: url, callbackURLScheme: "art.onlyideas.app")
      { [weak self] url, error in
        Task { @MainActor in
          guard let self = self else { return }
          defer {
            self.signingIn = false
            self.authentication = nil
          }
          guard error == nil, url?.host == "oauth" else {
            if let error = error,
              (error as NSError).code != ASWebAuthenticationSessionError.canceledLogin.rawValue
            {
              self.error = error.localizedDescription
            }
            return
          }
          do {
            let result = try await self.json(
              "/api/auth/native/complete", method: "POST", body: ["flow": id, "verifier": verifier])
            guard let token = result["token"] as? String else {
              throw self.failure(T("Sign-in is not complete. Please try again."))
            }
            try self.saveToken(token)
            await self.refresh()
          } catch { self.error = error.localizedDescription }
        }
      }
      authentication?.presentationContextProvider = self
      if authentication?.start() != true { throw failure(T("Could not open secure sign-in.")) }
    } catch {
      self.error = error.localizedDescription
      signingIn = false
    }
  }
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
      .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
  }
  func deleteAccount() async {
    do {
      _ = try await json("/api/account", method: "DELETE", body: ["confirm": "DELETE"])
      await signOut()
    } catch { self.error = error.localizedDescription }
  }
  func signOut() async {
    _ = try? await json("/api/auth/logout", method: "POST", body: [:])
    try? saveToken(nil)
    account = nil
    credits = nil
    subscriptionCatalog=nil;subscriptionProducts=[];purchaseNotice=nil
    resolveCreditPrompt(false)
    draftAttachments = []
    messages = []
    conversations = []
    conversationID = nil
    agentStatus = ""
    jobs = []
    clearPrivateDownloads()
    clearExports()
    await WKWebsiteDataStore.default().removeData(
      ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
      modifiedSince: Date(timeIntervalSince1970: 0))
    UserDefaults.standard.removeObject(forKey: "onlyideas.native.account")
    UserDefaults.standard.removeObject(forKey: "onlyideas.apple.user")
    await refresh()
  }
  private func metadataURL(_ url: URL) -> URL { url.appendingPathExtension("meta") }
  private func saveMetadata(_ document: ReaderDocument, at url: URL) throws {
    var summary = document
    summary.figures = [:]
    summary.paper.mmd = nil
    summary.paper.sections = nil
    try JSONEncoder().encode(summary).write(
      to: metadataURL(url), options: [.atomic, .completeFileProtection])
  }
  private func metadata(_ url: URL) -> ReaderDocument? {
    if let bytes = try? Data(contentsOf: metadataURL(url)),
      let record = try? JSONDecoder().decode(ReaderDocument.self, from: bytes)
    {
      return record
    }
    guard let bytes = try? Data(contentsOf: url),
      var record = try? JSONDecoder().decode(ReaderDocument.self, from: bytes)
    else { return nil }
    try? saveMetadata(record, at: url)
    record.figures = [:]
    record.paper.mmd = nil
    record.paper.sections = nil
    return record
  }
  func downloads() -> [ReaderDocument] {
    ((try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil))
      ?? [])
      .filter { $0.pathExtension == "json" }.compactMap { url in
        guard let d = metadata(url), d.owner == "public" || d.owner == account?.id else {
          return nil
        }
        return d
      }
  }
  private func downloadURL(_ id: String) -> URL {
    folder.appendingPathComponent(
      Data(SHA256.hash(data: Data(id.utf8))).map { String(format: "%02x", $0) }.joined() + ".json")
  }
  func isDownloaded(_ id: String) -> Bool { downloads().contains { $0.paper.id == id && ($0.pinned ?? true) } }
  func cachedPaper(_ id: String) -> ReaderDocument? {
    guard let bytes = try? Data(contentsOf: downloadURL(id)),
      let saved = try? JSONDecoder().decode(ReaderDocument.self, from: bytes),
      saved.owner == "public" || saved.owner == account?.id else { return nil }
    return saved
  }
  private func removeCached(_ id: String) {
    let url = downloadURL(id)
    try? FileManager.default.removeItem(at: url)
    try? FileManager.default.removeItem(at: metadataURL(url))
  }
  private func saveCached(_ document: ReaderDocument) throws {
    guard document.owner == "public" || document.owner == account?.id else { return }
    let url = downloadURL(document.paper.id)
    try JSONEncoder().encode(document).write(to: url, options: [.atomic, .completeFileProtection])
    try saveMetadata(document, at: url)
    let recent = downloads().filter { $0.pinned == false }.sorted { ($0.accessed ?? 0) > ($1.accessed ?? 0) }
    var bytes = 0
    for (index, saved) in recent.enumerated() {
      bytes += (try? downloadURL(saved.paper.id).resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
      if index >= 20 || bytes > 150_000_000 { removeCached(saved.paper.id) }
    }
  }
  func clearPrivateDownloads() {
    warming?.cancel()
    papers = papers.filter { $0.visibility == "public" }
    for url in (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? [] where url.pathExtension == "index" { try? FileManager.default.removeItem(at: url) }
    for url
      in ((try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil))
      ?? []) where url.pathExtension == "json"
    {
      if metadata(url)?.owner != "public" {
        try? FileManager.default.removeItem(at: url)
        try? FileManager.default.removeItem(at: metadataURL(url))
      }
    }
  }
  func loadPaper(_ paper: ResearchPaper, refresh: Bool = false) async throws -> ReaderDocument {
    let cached = cachedPaper(paper.id)
    if let cached, !refresh { return cached }
    let identity = token, owner = account?.id
    do {
      let result = try await json("/api/papers/\(paper.id)")
      try Task.checkCancellation()
      guard token == identity else { throw CancellationError() }
      let full = try decoded(ResearchPaper.self, result["paper"] ?? [:])
      var figures: [String: String] = [:]
      var total = 0
      for asset in full.assets ?? [] {
        guard asset.path.hasPrefix("figures/"), !asset.path.contains("..") else { continue }
        if cached?.paper.revision == full.revision, let figure = cached?.figures[asset.path] {
          figures[asset.path] = figure; continue
        }
        let bytes = try await request("/content/\(full.id)/\(asset.path)")
        try Task.checkCancellation()
        guard token == identity else { throw CancellationError() }
        total += bytes.count
        guard total <= 50_000_000 else { throw failure(T("This paper is too large to download.")) }
        let ext = (asset.path as NSString).pathExtension.lowercased()
        let mime = ext == "svg" ? "image/svg+xml" : ext == "jpg" ? "image/jpeg" : "image/\(ext)"
        figures[asset.path] = "data:\(mime);base64,\(bytes.base64EncodedString())"
      }
      let document = ReaderDocument(paper: full, figures: figures,
        owner: full.visibility == "public" ? "public" : owner ?? "private",
        pinned: cached.map { $0.pinned ?? true } ?? false, accessed: Date().timeIntervalSince1970)
      try Task.checkCancellation()
      guard token == identity else { throw CancellationError() }
      try saveCached(document)
      return document
    } catch {
      let denied = (error as NSError).domain == "OnlyIdeasHTTP" && [401,403,404].contains((error as NSError).code)
      if denied { removeCached(paper.id); throw error }
      guard token == identity, !Task.isCancelled else { throw CancellationError() }
      if let cached { return cached }
      throw error
    }
  }
  func toggleDownload(_ document: ReaderDocument) throws {
    var saved = cachedPaper(document.paper.id) ?? document
    let pin = !isDownloaded(document.paper.id)
    if pin && downloads().filter({ $0.pinned ?? true }).count >= 30 { throw failure(T("Unpin a download before saving another paper.")) }
    saved.pinned = pin
    saved.accessed = Date().timeIntervalSince1970
    try saveCached(saved)
    objectWillChange.send()
  }
  func importPDF(_ url: URL, shared: Bool = true) async {
    guard account != nil else {
      await signIn()
      return
    }
    busy = true
    defer { busy = false }
    let access = url.startAccessingSecurityScopedResource()
    defer { if access { url.stopAccessingSecurityScopedResource() } }
    do {
      guard let limit = try await authorizeImport(shared:shared,pdf:true) else { return }
      let length = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
      guard length <= 20_000_000 else { throw failure(T("Choose a PDF smaller than 20 MB.")) }
      let bytes = try Data(contentsOf: url)
      guard bytes.count <= 20_000_000 else { throw failure(T("Choose a PDF smaller than 20 MB.")) }
      let title =
        url.deletingPathExtension().lastPathComponent.addingPercentEncoding(
          withAllowedCharacters: .urlQueryAllowed) ?? "Paper"
      _ = try await request(
        "/api/import", method: "POST", data: bytes,
        headers: [
          "Content-Type": "application/pdf", "X-Request-Id": UUID().uuidString.lowercased(),
          "X-Paper-Title": title, "X-Paper-Language": "en", "X-Paper-Sharing": shared ? "shared" : "private", "X-Credit-Limit":String(limit),
        ])
      await loadJobs()
    } catch { self.error = error.localizedDescription }
  }
  func attach(_ urls:[URL]) async {
    guard urls.count + draftAttachments.count <= 3 else { error = T("Attach up to three files."); return }
    for url in urls {
      let access = url.startAccessingSecurityScopedResource()
      do {
        let size = try url.resourceValues(forKeys:[.fileSizeKey]).fileSize ?? 0
        guard size <= 20_000_000 else { throw failure(T("Choose a file smaller than 20 MB.")) }
        var bytes = try Data(contentsOf:url), name = url.lastPathComponent
        if ["heic","heif"].contains(url.pathExtension.lowercased()), let image = UIImage(data:bytes), let jpeg = image.jpegData(compressionQuality:0.9) { bytes=jpeg;name=url.deletingPathExtension().lastPathComponent+".jpg" }
        await attachData(bytes,name:name)
      } catch { self.error = error.localizedDescription }
      if access { url.stopAccessingSecurityScopedResource() }
    }
  }
  func attachData(_ bytes:Data, name:String) async {
    guard account != nil else { await signIn(); return }
    guard !attachmentBusy, draftAttachments.count < 3 else { error=T("Attach up to three files.");return }
    guard bytes.count <= 20_000_000 else { error=T("Choose a file smaller than 20 MB.");return }
    let identity=token
    attachmentBusy=true
    defer { attachmentBusy=false }
    do {
      let shared=sharedImports
      guard let limit=try await authorizeImport(shared:shared,pdf:name.lowercased().hasSuffix(".pdf")) else {return}
      let encoded=name.addingPercentEncoding(withAllowedCharacters:.alphanumerics) ?? "file"
      let data=try await request("/api/attachments",method:"POST",data:bytes,headers:["Content-Type":"application/octet-stream","X-File-Name":encoded,"X-Paper-Sharing":shared ? "shared":"private","X-Credit-Limit":String(limit)])
      guard identity==token else { return }
      let response=try JSONSerialization.jsonObject(with:data) as? [String:Any] ?? [:]
      let item=try decoded(AgentAttachment.self,response["attachment"] ?? [:])
      if !draftAttachments.contains(where:{$0.id==item.id}) { draftAttachments.append(item) }
    } catch { self.error=error.localizedDescription }
  }
  func loadJobs(refreshLibrary: Bool = true) async {
    guard account != nil else { return }
    let identity=token
    do {
      let r = try await json("/api/jobs")
      guard identity==token else {return}
      let next=try decoded([ReadingJob].self, r["jobs"] ?? [])
      let previous=Dictionary(jobs.map {($0.id,$0.state)},uniquingKeysWith:{_,new in new})
      let finished=next.contains {($0.state=="completed" || $0.state=="failed") && previous[$0.id] != $0.state}
      jobs=next
      if refreshLibrary && finished {await refresh();await loadCredits()}
    } catch {}
  }
  func loadConversations() async {
    guard account != nil else { return }
    do {
      let r = try await json("/api/chats")
      conversations = try decoded([Conversation].self, r["chats"] ?? [])
    } catch { self.error = error.localizedDescription }
  }
  func loadConversation(_ id: String) async {
    do {
      let r = try await json("/api/chats/\(id)")
      guard conversationID == id else { return }
      messages = try decoded([AgentMessage].self, r["messages"] ?? [])
      let pending = (r["pending"] as? [[String: Any]])?.first
      let online = (r["agent"] as? [String: Any])?["online"] as? Bool ?? false
      agentStatus =
        pending == nil
        ? ""
        : online
          ? pending?["status"] as? String ?? "Working…"
          : "Your request is saved. Waiting for the paper agent…"
    } catch { agentStatus = "Connection interrupted. Your conversation is saved." }
  }
  func newConversation() {
    draftAttachments = []
    conversationID = nil
    messages = []
    agentStatus = ""
  }
  func selectConversation(_ chat: Conversation) async {
    conversationID = chat.id
    await loadConversation(chat.id)
  }
  func send(_ text: String) async {
    guard account != nil else {
      await signIn()
      return
    }
    guard !busy, !attachmentBusy, agentStatus.isEmpty, (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !draftAttachments.isEmpty)
    else { return }
    busy = true
    defer { busy = false }
    do {
      if conversationID == nil {
        let r = try await json("/api/chats", method: "POST", body: [:])
        conversationID = (r["chat"] as? [String: Any])?["id"] as? String
      }
      guard let id = conversationID else { throw failure(T("Could not start the conversation.")) }
      _ = try await json("/api/chats/\(id)/messages", method: "POST", body: ["text": text, "attachments":draftAttachments.map(\.id), "language":UILanguage.current])
      draftAttachments = []
      await loadConversation(id)
      await loadConversations()
    } catch { self.error = error.localizedDescription }
  }
  func deleteConversation(_ chat: Conversation) async {
    do {
      _ = try await json("/api/chats/\(chat.id)", method: "DELETE")
      if conversationID == chat.id { newConversation() }
      await loadConversations()
    } catch { self.error = error.localizedDescription }
  }
  func importFound(_ paper: FoundPaper, shared: Bool = true) async {
    guard let id = conversationID else { return }
    do {
      guard let limit=try await authorizeImport(shared:shared,pdf:true) else {return}
      _ = try await json("/api/chats/\(id)/import", method: "POST", body: ["paperId": paper.id, "sharing": shared ? "shared" : "private","creditLimit":limit])
      await loadConversation(id)
      await loadJobs()
    } catch { self.error = error.localizedDescription }
  }
  func loadCredits() async {
    guard account != nil else {credits=nil;return}
    let identity=token
    do {let value=try JSONDecoder().decode(ReadingCredits.self,from:await request("/api/credits"));if identity==token {credits=value}}
    catch {if identity==token {credits=nil;self.error=error.localizedDescription}}
  }
  func resolveCreditPrompt(_ allowed:Bool) {
    let pending=creditDecision;creditDecision=nil;creditPrompt=nil;pending?.resume(returning:allowed)
  }
  func authorizeImport(shared:Bool,pdf:Bool,amount:Int?=nil) async throws -> Int? {
    if shared {return 0}
    guard creditDecision==nil else {return nil}
    let identity=token
    let value=try JSONDecoder().decode(ReadingCredits.self,from:await request("/api/credits"))
    guard token==identity,account != nil else {return nil}
    credits=value
    if !value.enabled {return 0}
    let cost=amount ?? (pdf ? value.maxPDF:1)
    let allowed=await withCheckedContinuation { continuation in
      creditDecision=continuation
      creditPrompt=T("Use up to {count} credits? Failed imports and unused credits are refunded.",["count":String(cost)])
    }
    return allowed && token==identity ? cost:nil
  }
}
extension Data {
  var base64URLEncoded: String {
    base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(
      of: "/", with: "_"
    ).replacingOccurrences(of: "=", with: "")
  }
}

// A single catalog is shipped with web and both native apps; paper content stays in its original language.
enum UILanguage {
  static let choices = [("en","English"),("zh-Hans","简体中文"),("zh-Hant","繁體中文"),("ja","日本語"),("ko","한국어"),("ar","العربية"),("es","Español"),("fr","Français"),("de","Deutsch"),("ru","Русский"),("vi","Tiếng Việt")]
  static var current: String {
    let choice = UserDefaults.standard.string(forKey:"onlyideas.native.language") ?? "system"
    let value = (choice == "system" ? Locale.preferredLanguages.first ?? "en" : choice).lowercased()
    if value.hasPrefix("zh") { return ["hant","tw","hk","mo"].contains(where:value.contains) ? "zh-Hant" : "zh-Hans" }
    return choices.first { value == $0.0 || value.hasPrefix($0.0 + "-") }?.0 ?? "en"
  }
  static let catalog: [String:[String:String]] = {
    guard let root = Bundle.main.url(forResource:"public",withExtension:nil), let data = try? Data(contentsOf:root.appendingPathComponent("locales.json")), let value = try? JSONDecoder().decode([String:[String:String]].self,from:data) else { return [:] }
    return value
  }()
}
func T(_ key:String, _ values:[String:String] = [:]) -> String {
  var lookup=key, substitutions=values
  if key.hasPrefix("Translating ") { let parts=key.dropFirst(12).split(separator:"/");if parts.count==2 && parts.allSatisfy({Int($0) != nil}) { lookup="Translating {current}/{total}";substitutions=["current":String(parts[0]),"total":String(parts[1])] } }
  var text = UILanguage.catalog[UILanguage.current]?[lookup] ?? lookup
  for (name,value) in substitutions { text = text.replacingOccurrences(of:"{"+name+"}",with:value) }
  return text
}


extension ReadingStore {
  func loadSubscriptions() async {
    guard account != nil else {subscriptionCatalog=nil;subscriptionProducts=[];return}
    let identity=token
    do {
      let catalog=try JSONDecoder().decode(SubscriptionCatalog.self,from:await request("/api/billing"))
      guard identity==token else {return}
      subscriptionCatalog=catalog
      guard catalog.enabled && catalog.providers.apple else {subscriptionProducts=[];return}
      let products=try await Product.products(for:catalog.plans.map(\.apple))
      guard identity==token else {return}
      subscriptionProducts=products.sorted {$0.price<$1.price}
    } catch {if identity==token {subscriptionCatalog=nil;subscriptionProducts=[]}}
  }
  private func deliverPurchase(_ result:VerificationResult<StoreKit.Transaction>) async throws {
    guard case .verified(let transaction)=result else {throw failure(T("The store could not verify this purchase."))}
    guard transaction.productID.hasPrefix("art.onlyideas."),account != nil else {return}
    let identity=token
    _=try await request("/api/billing/apple",method:"POST",body:["signedTransaction":result.jwsRepresentation])
    guard identity==token else {return}
    await transaction.finish()
    requestedPlanID=nil
    await loadCredits()
    await loadSubscriptions()
    purchaseNotice=T("Your purchases are up to date.")
  }
  func purchase(_ product:Product) async {
    guard !purchaseBusy,let catalog=subscriptionCatalog,catalog.enabled,catalog.providers.apple,catalog.canSubscribe,
      let binding=catalog.accountToken.flatMap(UUID.init(uuidString:)),account != nil else {return}
    let identity=token;purchaseBusy=true;purchaseNotice=nil
    defer {purchaseBusy=false}
    do {
      switch try await product.purchase(options:[.appAccountToken(binding)]) {
      case .success(let result): if identity==token {try await deliverPurchase(result)}
      case .pending: purchaseNotice=T("Payment is pending. Benefits will appear after the store confirms payment.")
      case .userCancelled: requestedPlanID=nil
      @unknown default: purchaseNotice=T("Please try restoring purchases.")
      }
    } catch {purchaseNotice=error.localizedDescription}
  }
  func restorePurchases() async {
    guard !purchaseBusy,account != nil else {return}
    purchaseBusy=true;purchaseNotice=nil;let identity=token
    defer {purchaseBusy=false}
    do {
      try await AppStore.sync()
      for await result in StoreKit.Transaction.currentEntitlements {
        guard identity==token else {return}
        try await deliverPurchase(result)
      }
      await loadSubscriptions();await loadCredits()
      purchaseNotice=T("Your purchases are up to date.")
    } catch {purchaseNotice=error.localizedDescription}
  }
}
