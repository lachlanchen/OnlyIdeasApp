import Foundation
#if os(iOS) && !targetEnvironment(macCatalyst)
import WatchConnectivity

final class WatchSender: NSObject, WCSessionDelegate {
    static let shared = WatchSender()
    private let key = "onlyideas.watch.shelf.v1"
    private var pending: Data?

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func save(_ reading: WatchReading) throws {
        guard WCSession.isSupported(), WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else {
            throw NSError(domain: "Watch", code: 1, userInfo: [NSLocalizedDescriptionKey: "Install OnlyIdeas on your paired Apple Watch first."])
        }
        guard reading.isValid else { throw NSError(domain: "Watch", code: 2) }
        let old = UserDefaults.standard.data(forKey: key).flatMap(WatchShelf.decode)?.readings ?? []
        try store(Array(([reading] + old.filter { $0.id != reading.id }).prefix(3)))
    }

    /// Remove cached excerpts when the connected phone learns a paper was withdrawn.
    func reconcile(publicIDs: Set<String>) {
        guard let old = UserDefaults.standard.data(forKey: key).flatMap(WatchShelf.decode) else { return }
        let available = old.readings.filter { publicIDs.contains($0.id) }
        if available != old.readings { try? store(available) }
    }

    private func store(_ readings: [WatchReading]) throws {
        let data = try JSONEncoder().encode(WatchShelf(schema: 1, readings: readings))
        guard WatchShelf.decode(data) != nil else { throw NSError(domain: "Watch", code: 3) }
        UserDefaults.standard.set(data, forKey: key)
        pending = data
        activate()
        try flush()
    }
    private func flush() throws {
        guard WCSession.default.activationState == .activated,
              let data = pending ?? UserDefaults.standard.data(forKey: key) else { return }
        try WCSession.default.updateApplicationContext(["shelf": data])
        pending = nil
    }
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { try? self.flush() }
    }
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async { try? self.flush() }
    }
}
#endif
