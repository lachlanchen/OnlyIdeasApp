import Foundation

enum PaperWatchExcerpt {
    /// Public prose only. Rendered mathematics and figures stay in the full reader.
    static func make(id: String, title: String, authors: String, markdown: String,
                     selection: String, isPublic: Bool) -> WatchReading? {
        guard isPublic else { return nil }
        let selected = selection.trimmingCharacters(in: .whitespacesAndNewlines)
        let source = selected.isEmpty ? markdown : selected
        var blocks: [String] = []
        var truncated = false
        for raw in source.components(separatedBy: "\n\n") {
            var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if text.isEmpty || text.hasPrefix("#") { continue }
            if text.contains("$") || text.contains("\\(") || text.contains("\\[") ||
                text.range(of: #"\\[A-Za-z]+"#, options: .regularExpression) != nil || text.contains("![") || text.contains("<") ||
                text.contains("```") || text.contains("|") {
                truncated = true; break
            }
            if selected.isEmpty {
                text = text.replacingOccurrences(of: #"\[([^\]]+)\]\([^\)]+\)"#, with: "$1", options: .regularExpression)
                text = text.replacingOccurrences(of: "**", with: "").replacingOccurrences(of: "__", with: "")
            }
            guard text.utf8.count <= 6000, blocks.count < 24 else { truncated = true; break }
            let candidate = WatchReading(id: id, title: String(title.prefix(150)), subtitle: String(authors.prefix(150)), blocks: blocks + [text], truncated: true)
            guard candidate.isValid else { truncated = true; break }
            blocks.append(text)
        }
        guard !blocks.isEmpty else { return nil }
        let reading = WatchReading(id: id, title: String(title.prefix(150)), subtitle: String(authors.prefix(150)), blocks: blocks, truncated: truncated || !selected.isEmpty)
        return reading.isValid ? reading : nil
    }
}
