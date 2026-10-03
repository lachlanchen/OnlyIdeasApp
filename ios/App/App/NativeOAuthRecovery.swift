import Foundation

/// Both the system browser callback and a scene URL can finish the same PKCE
/// flow. Polling recovers a lost return without starting another OAuth request.
@MainActor final class NativeOAuthRecovery {
  typealias Redeem = (String, String) async throws -> String?
  private struct Attempt {
    let id: UUID
    let flow: String
    let verifier: String
    let deadline: Date
    let accept: (String) throws -> Void
    let finish: (Error?) -> Void
  }
  private let redeem: Redeem
  private var attempt: Attempt?
  private var requestID: UUID?
  private var polling: Task<Void, Never>?

  init(redeem: @escaping Redeem) { self.redeem = redeem }
  var active: Bool { attempt != nil }

  func start(flow: String, verifier: String, lifetime: TimeInterval = 600,
             interval: UInt64 = 5_000_000_000,
             accept: @escaping (String) throws -> Void,
             finish: @escaping (Error?) -> Void) {
    cancel()
    let next = Attempt(id: UUID(), flow: flow, verifier: verifier,
                       deadline: Date().addingTimeInterval(lifetime), accept: accept, finish: finish)
    attempt = next
    polling = Task { [weak self] in
      while !Task.isCancelled {
        guard self?.attempt?.id == next.id else { return }
        await self?.check()
        do { try await Task.sleep(nanoseconds: interval) } catch { return }
      }
    }
  }

  @discardableResult func receive(_ url: URL) -> Bool {
    guard let current = attempt,
          url.scheme == "art.onlyideas.app", url.host == "oauth", url.path == "/complete",
          url.user == nil, url.password == nil, url.port == nil, url.fragment == nil,
          let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
          items.count == 1, items[0].name == "flow", items[0].value == current.flow
    else { return false }
    Task { await check() }
    return true
  }

  func check() async {
    guard let current = attempt else { return }
    guard Date() < current.deadline else {
      end(current.id, error: NSError(domain: "OnlyIdeasOAuth", code: 408,
        userInfo: [NSLocalizedDescriptionKey: "Sign-in is not complete. Please try again."]))
      return
    }
    guard requestID != current.id else { return }
    requestID = current.id
    defer { if requestID == current.id { requestID = nil } }
    do {
      let token = try await redeem(current.flow, current.verifier)
      guard attempt?.id == current.id, !Task.isCancelled else { return }
      if let token {
        try current.accept(token)
        end(current.id, error: nil)
      }
    } catch {
      guard attempt?.id == current.id, !Task.isCancelled else { return }
      let failure = error as NSError
      // Temporary network/provider failures keep the same proof and deadline.
      if failure.domain == "OnlyIdeasHTTP", (400..<500).contains(failure.code), failure.code != 429 {
        end(current.id, error: error)
      } else if failure.domain != NSURLErrorDomain && failure.domain != "OnlyIdeasHTTP" {
        end(current.id, error: error)
      }
    }
  }

  func cancel(error: Error? = nil) {
    if let id = attempt?.id { end(id, error: error) }
  }
  private func end(_ id: UUID, error: Error?) {
    guard let current = attempt, current.id == id else { return }
    attempt = nil
    polling?.cancel(); polling = nil
    current.finish(error)
  }
}
