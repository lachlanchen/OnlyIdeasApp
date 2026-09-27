import AuthenticationServices
import CryptoKit
import Foundation
import Security
import SwiftUI
import WebKit

struct ResearchPaper: Codable, Identifiable {
  var id: String
  var title: String
  var authors: String?
  var language: String?
  var category: String?
  var visibility: String?
  var mmd: String?
  var revision: String?
  var assets: [PaperAsset]?
  var sections: [PaperSection]?
}
struct ReadingArtifact: Codable, Identifiable {
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
struct AgentMessage: Codable, Identifiable {
  var id: String
  var role: String
  var text: String
  var papers: [FoundPaper]?
  var jobId: String?
}
struct ReaderDocument: Codable {
  var paper: ResearchPaper
  var figures: [String: String]
  var owner: String
}
struct ReadingJob: Codable, Identifiable {
  var id: String
  var kind: String
  var state: String
  var message: String
  var paperId: String?
}
struct PaperComment: Codable, Identifiable {
  var id: String
  var author: String
  var text: String
  var quote: String?
  var canDelete: Bool?
  var pending: Bool?
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
  @Published var error: String?
  @Published var busy = false
  @Published var offline = false
  @Published var signingIn = false
  @Published var showSignIn = false
  @Published var showReport = false
  var reportContext = ""
  private var appleFlow: (id: String, verifier: String)?
  private var appleController: ASAuthorizationController?
  @AppStorage("onlyideas.native.font") var readingSize: Double = 22
  @AppStorage("onlyideas.native.appearance") var appearance = "system"
  private var token: String?
  private var authentication: ASWebAuthenticationSession?
  private let origin = "https://agent.onlyideas.art"
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
          throw failure("Could not save your secure session.")
        }
      } else if status != errSecSuccess {
        throw failure("Could not update your secure session.")
      }
    } else {
      SecItemDelete(q as CFDictionary)
    }
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
        throw failure("Offline test")
      }
    #endif
    guard let url = URL(string: origin + path) else { throw failure("Invalid request.") }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.timeoutInterval = 65
    request.setValue("capacitor://localhost", forHTTPHeaderField: "Origin")
    request.setValue("native", forHTTPHeaderField: "X-OnlyIdeas-Client")
    if let token = token {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    if let body = body {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    if let data = data { request.httpBody = data }
    for (k, v) in headers { request.setValue(v, forHTTPHeaderField: k) }
    let (bytes, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      let value = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any]
      throw failure(value?["error"] as? String ?? "Connection interrupted. Please try again.")
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
      let result = try await json("/api/papers")
      papers = try decoded([ResearchPaper].self, result["papers"] ?? [])
      offline = false
      if account != nil {
        await loadConversations()
        await loadJobs()
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
      guard let flow = result["flow"] as? String, let nonce = result["nonce"] as? String else { throw failure("Could not start Apple sign-in.") }
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
        else { throw failure("Apple did not finish sign-in. Please try again.") }
        let name = credential.fullName.map { PersonNameComponentsFormatter().string(from: $0) } ?? ""
        let result = try await json("/api/auth/apple/complete", method: "POST", body: ["flow": flow.id, "verifier": flow.verifier, "identityToken": identity, "code": code, "name": name])
        guard let token = result["token"] as? String else { throw failure("Could not save sign-in.") }
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
      else { throw failure("Could not start sign-in.") }
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
              throw self.failure("Sign-in is not complete. Please try again.")
            }
            try self.saveToken(token)
            await self.refresh()
          } catch { self.error = error.localizedDescription }
        }
      }
      authentication?.presentationContextProvider = self
      if authentication?.start() != true { throw failure("Could not open secure sign-in.") }
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
  func isDownloaded(_ id: String) -> Bool { downloads().contains { $0.paper.id == id } }
  func clearPrivateDownloads() {
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
  func loadPaper(_ paper: ResearchPaper) async throws -> ReaderDocument {
    do {
      let result = try await json("/api/papers/\(paper.id)")
      let full = try decoded(ResearchPaper.self, result["paper"] ?? [:])
      var figures: [String: String] = [:]
      var total = 0
      for asset in full.assets ?? [] {
        guard asset.path.hasPrefix("figures/"), !asset.path.contains("..") else { continue }
        let bytes = try await request("/content/\(full.id)/\(asset.path)")
        total += bytes.count
        guard total <= 50_000_000 else { throw failure("This paper is too large to download.") }
        let ext = (asset.path as NSString).pathExtension.lowercased()
        let mime = ext == "svg" ? "image/svg+xml" : ext == "jpg" ? "image/jpeg" : "image/\(ext)"
        figures[asset.path] = "data:\(mime);base64,\(bytes.base64EncodedString())"
      }
      return ReaderDocument(
        paper: full, figures: figures,
        owner: full.visibility == "public" ? "public" : account?.id ?? "private")
    } catch {
      if let bytes = try? Data(contentsOf: downloadURL(paper.id)),
        let saved = try? JSONDecoder().decode(ReaderDocument.self, from: bytes),
        saved.owner == "public" || saved.owner == account?.id
      {
        return saved
      }
      throw error
    }
  }
  func toggleDownload(_ document: ReaderDocument) throws {
    let url = downloadURL(document.paper.id)
    if isDownloaded(document.paper.id) {
      try FileManager.default.removeItem(at: url)
      try? FileManager.default.removeItem(at: metadataURL(url))
    } else {
      guard downloads().count < 30 else {
        throw failure("Remove a download before saving another paper.")
      }
      try JSONEncoder().encode(document).write(
        to: url, options: [.atomic, .completeFileProtection])
      try saveMetadata(document, at: url)
      var excluded = url
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try excluded.setResourceValues(values)
    }
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
      let length = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
      guard length <= 20_000_000 else { throw failure("Choose a PDF smaller than 20 MB.") }
      let bytes = try Data(contentsOf: url)
      guard bytes.count <= 20_000_000 else { throw failure("Choose a PDF smaller than 20 MB.") }
      let title =
        url.deletingPathExtension().lastPathComponent.addingPercentEncoding(
          withAllowedCharacters: .urlQueryAllowed) ?? "Paper"
      _ = try await request(
        "/api/import", method: "POST", data: bytes,
        headers: [
          "Content-Type": "application/pdf", "X-Request-Id": UUID().uuidString.lowercased(),
          "X-Paper-Title": title, "X-Paper-Language": "en", "X-Paper-Sharing": shared ? "shared" : "private",
        ])
      await loadJobs()
    } catch { self.error = error.localizedDescription }
  }
  func loadJobs() async {
    guard account != nil else { return }
    do {
      let r = try await json("/api/jobs")
      jobs = try decoded([ReadingJob].self, r["jobs"] ?? [])
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
    guard !busy, agentStatus.isEmpty, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else { return }
    busy = true
    defer { busy = false }
    do {
      if conversationID == nil {
        let r = try await json("/api/chats", method: "POST", body: [:])
        conversationID = (r["chat"] as? [String: Any])?["id"] as? String
      }
      guard let id = conversationID else { throw failure("Could not start the conversation.") }
      _ = try await json("/api/chats/\(id)/messages", method: "POST", body: ["text": text])
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
      _ = try await json("/api/chats/\(id)/import", method: "POST", body: ["paperId": paper.id, "sharing": shared ? "shared" : "private"])
      await loadConversation(id)
      await loadJobs()
    } catch { self.error = error.localizedDescription }
  }
}
extension Data {
  var base64URLEncoded: String {
    base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(
      of: "/", with: "_"
    ).replacingOccurrences(of: "=", with: "")
  }
}
