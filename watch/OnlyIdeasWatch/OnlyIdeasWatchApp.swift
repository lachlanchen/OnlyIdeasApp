import SwiftUI
import WatchConnectivity

@main
struct OnlyIdeasWatchApp: App {
    @StateObject private var shelf = ReadingShelf()
    var body: some Scene {
        WindowGroup { WatchLibrary().environmentObject(shelf) }
    }
}

final class ReadingShelf: NSObject, ObservableObject, WCSessionDelegate {
    @Published private(set) var readings: [WatchReading] = []
    private let key = "onlyideas.watch.shelf.v1"
    override init() {
        super.init()
        if let data = UserDefaults.standard.data(forKey: key) { receive(data) }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }
    private func receive(_ data: Data) {
        guard let shelf = WatchShelf.decode(data) else { return }
        readings = shelf.readings
        UserDefaults.standard.set(data, forKey: key)
    }
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let data = session.receivedApplicationContext["shelf"] as? Data {
            DispatchQueue.main.async { self.receive(data) }
        }
    }
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let data = applicationContext["shelf"] as? Data {
            DispatchQueue.main.async { self.receive(data) }
        }
    }
}

struct WatchLibrary: View {
    @EnvironmentObject private var shelf: ReadingShelf
    @State private var path: [String] = []
    var body: some View {
        NavigationStack(path: $path) {
            List {
                if shelf.readings.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "books.vertical.fill").font(.largeTitle).foregroundStyle(.cyan)
                        Text("A little reading, anywhere").font(.headline)
                        Text("Open a shared paper on your iPhone and choose Send excerpt to Watch. Your latest three excerpts stay here offline.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }.padding(.vertical, 6)
                }
                ForEach(shelf.readings) { reading in
                    NavigationLink(value: reading.id) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(reading.title).font(.headline).foregroundStyle(.cyan).lineLimit(3)
                            Text(reading.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        }
                    }
                }
            }.navigationTitle("OnlyIdeas")
            .navigationDestination(for: String.self) { id in
                if let reading = shelf.readings.first(where: { $0.id == id }) { WatchReader(reading: reading) }
            }
            #if DEBUG
            .onReceive(shelf.$readings) { readings in
                if ProcessInfo.processInfo.arguments.contains("--reading-qa"), path.isEmpty, let reading = readings.first {
                    path = [reading.id]
                }
            }
            #endif
        }.tint(.cyan)
    }
}

struct WatchReader: View {
    let reading: WatchReading
    @AppStorage("watch.textSize") private var textSize = 17.0
    @State private var page = 0
    @State private var sizing = false
    private var positionKey: String { "watch.position.\(reading.id)" }
    var body: some View {
        ScrollViewReader { scroll in
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text(reading.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2).id("top")
                    Text(reading.blocks[min(page, reading.blocks.count - 1)])
                        .font(.system(size: min(24, max(14, textSize)), design: .serif))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("\(page + 1) / \(reading.blocks.count)").font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Button { page -= 1 } label: { Image(systemName: "chevron.left") }
                            .disabled(page == 0).accessibilityLabel("Previous passage")
                        Button { page += 1 } label: { Image(systemName: "chevron.right") }
                            .disabled(page >= reading.blocks.count - 1).accessibilityLabel("Next passage")
                    }
                    if page == reading.blocks.count - 1 {
                        Text(LocalizedStringKey(reading.truncated ? "Continue the full paper on your iPhone." : "End of excerpt"))
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }.padding(.horizontal, 2)
            }
            .onChange(of: page) { _, value in
                UserDefaults.standard.set(value, forKey: positionKey)
                scroll.scrollTo("top", anchor: .top)
            }
        }
        .navigationTitle(reading.title)
        .toolbar { ToolbarItem(placement: .topBarTrailing) {
            Button { sizing = true } label: { Image(systemName: "textformat.size") }.accessibilityLabel("Text size")
        } }
        .sheet(isPresented: $sizing) {
            VStack(spacing: 16) {
                Text("Text size").font(.headline)
                Stepper(value: $textSize, in: 14...24, step: 1) { Text("\(Int(textSize))") }
                Button("Done") { sizing = false }
            }.padding()
        }
        .onAppear { page = min(max(0, UserDefaults.standard.integer(forKey: positionKey)), reading.blocks.count - 1) }
    }
}
