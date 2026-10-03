import Foundation

@main struct OAuthRecoveryCheck {
  @MainActor static func main() async throws {
    func require(_ value: Bool, _ message: String) {
      precondition(value, message)
    }
    func settle() async { for _ in 0..<30 { await Task.yield() } }
    let flow = String(repeating: "a", count: 43)
    var requests = 0, accepted = 0, finished = 0
    var reply: CheckedContinuation<String?, Error>?
    let recovery = NativeOAuthRecovery { id, proof in
      require(id == flow && proof == "private-proof", "PKCE flow/proof changed")
      requests += 1
      return try await withCheckedThrowingContinuation { reply = $0 }
    }
    recovery.start(flow: flow, verifier: "private-proof", accept: { token in
      require(token == "fixture-session", "Wrong session")
      accepted += 1
    }, finish: { error in require(error == nil, "Unexpected failure"); finished += 1 })
    await settle()
    require(requests == 1, "Initial recovery check missing")
    require(!recovery.receive(URL(string: "art.onlyideas.app://oauth/complete?flow=wrong")!), "Wrong flow accepted")
    require(!recovery.receive(URL(string: "art.onlyideas.app://oauth/complete?flow=\(flow)&flow=\(flow)")!), "Ambiguous flow accepted")
    require(!recovery.receive(URL(string: "https://oauth/complete?flow=\(flow)")!), "Wrong scheme accepted")
    require(!recovery.receive(URL(string: "art.onlyideas.app://oauth/other?flow=\(flow)")!), "Wrong path accepted")
    require(recovery.receive(URL(string: "art.onlyideas.app://oauth/complete?flow=\(flow)")!), "Scene callback rejected")
    await recovery.check(); await settle()
    require(requests == 1, "Concurrent callbacks redeemed twice")
    reply?.resume(returning: nil); reply = nil; await settle()
    Task { await recovery.check() }; await settle()
    require(requests == 2, "Pending result did not permit a later recovery")
    reply?.resume(returning: "fixture-session"); reply = nil; await settle()
    require(accepted == 1 && finished == 1 && !recovery.active, "Lost-return recovery failed")
    await recovery.check()
    require(requests == 2, "Completed flow redeemed again")

    recovery.start(flow: flow, verifier: "private-proof", accept: { _ in accepted += 1 }, finish: { _ in finished += 1 })
    await settle(); recovery.cancel()
    reply?.resume(returning: "late-session"); reply = nil; await settle()
    require(accepted == 1 && finished == 2, "Canceled response changed the account")

    var timedOut = false
    recovery.start(flow: flow, verifier: "private-proof", lifetime: -1,
      accept: { _ in preconditionFailure("Expired flow accepted") },
      finish: { error in timedOut = (error as NSError?)?.code == 408 })
    await settle()
    require(timedOut && !recovery.active, "Expired sign-in remained stuck")

    var tries = 0, transientAccepted = false
    let transient = NativeOAuthRecovery { _, _ in
      tries += 1
      if tries == 1 { throw URLError(.networkConnectionLost) }
      return "recovered"
    }
    transient.start(flow: flow, verifier: "proof", accept: { _ in transientAccepted = true }, finish: { _ in })
    await settle(); require(transient.active, "Transient failure stopped sign-in")
    await transient.check()
    require(transientAccepted && tries == 2, "Transient failure did not recover")
    print("OAuth recovery: callback binding, duplicate suppression, pending recovery, cancellation, timeout and transient retry passed")
  }
}
