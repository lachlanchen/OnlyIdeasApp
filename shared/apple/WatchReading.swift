import Foundation

/// A bounded, text-only excerpt. The full illustrated edition stays on the phone.
struct WatchReading: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let subtitle: String
    let blocks: [String]
    let truncated: Bool

    var isValid: Bool {
        !id.isEmpty && id.utf8.count <= 256 && !title.isEmpty && title.utf8.count <= 600 &&
        subtitle.utf8.count <= 600 && !blocks.isEmpty && blocks.count <= 24 &&
        blocks.allSatisfy { !$0.isEmpty && $0.utf8.count <= 6000 } &&
        ((try? JSONEncoder().encode(self).count) ?? Int.max) <= 15000
    }
}

struct WatchShelf: Codable {
    let schema: Int
    let readings: [WatchReading]

    static func decode(_ data: Data) -> WatchShelf? {
        guard data.count <= 50000, let shelf = try? JSONDecoder().decode(Self.self, from: data),
              shelf.schema == 1, shelf.readings.count <= 3,
              Set(shelf.readings.map(\.id)).count == shelf.readings.count,
              shelf.readings.allSatisfy(\.isValid) else { return nil }
        return shelf
    }
}
