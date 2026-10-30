import Foundation
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
    @StateObject private var updates=PublicAppUpdates(feed:"https://agent.onlyideas.art/updates.json",platform:"ios",prefix:"watch.app-updates")
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        NavigationStack(path: $path) {
            List {
                if updates.showPrompt {Section {
                    Text("Update available").font(.headline)
                    Text("Update the app from the App Store on your iPhone.").font(.footnote)
                    Link("Open store",destination:URL(string:"https://apps.apple.com/app/id6816392935?platform=appleWatch")!)
                    Button("Later"){updates.dismiss()}
                }}
                if shelf.readings.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "books.vertical.fill").font(.largeTitle).foregroundStyle(.cyan)
                        Text("A little reading, anywhere").font(.headline)
                        Text("Open a shared paper on your iPhone and choose Send to Watch. Your latest three excerpts stay here offline.")
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
                Section {
                    Button("Check for updates"){Task{await updates.check(force:true)}}.disabled(updates.checking)
                    if !updates.status.isEmpty {Text(LocalizedStringKey(updates.status)).font(.footnote).foregroundStyle(.secondary)}
                    if updates.version != nil && !updates.showPrompt {Link("Open store",destination:URL(string:"https://apps.apple.com/app/id6816392935?platform=appleWatch")!)}
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
        .task{await updates.check()}
        .onChange(of:scenePhase){phase in if phase == .active {Task{await updates.check()}}}
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

// Public release checks are independent of accounts, papers and purchases.
@MainActor
final class PublicAppUpdates: ObservableObject {
  @Published var version: String?
  @Published var status = ""
  @Published private(set) var checking = false
  @Published private var snoozed = false
  private var checkedAt = Date.distantPast
  private let feed: String
  private let platform: String
  private let prefix: String
  private var releaseKey = ""
  init(feed:String, platform:String, prefix:String) { self.feed=feed;self.platform=platform;self.prefix=prefix }
  var showPrompt:Bool {version != nil && !snoozed}
  static func compare(_ a:String,_ b:String)->Int? {
    func parts(_ value:String)->[Int]? {let values=value.split(separator:".",omittingEmptySubsequences:false);guard (1...4).contains(values.count),values.allSatisfy({!$0.isEmpty && $0.count<=8 && $0.allSatisfy({$0.isASCII && $0.isNumber})}) else{return nil};return values.compactMap{Int($0)}}
    guard let left=parts(a),let right=parts(b) else{return nil}
    for i in 0..<max(left.count,right.count) {let x=i<left.count ? left[i] : 0,y=i<right.count ? right[i] : 0;if x != y{return x>y ? 1 : -1}}
    return 0
  }
  func dismiss() {UserDefaults.standard.set(releaseKey,forKey:prefix+".release");UserDefaults.standard.set(Date().timeIntervalSince1970,forKey:prefix+".dismissed");snoozed=true}
  func check(force:Bool=false) async {
    guard !checking else{return}
    let now=Date()
    guard force || now.timeIntervalSince(checkedAt)>=21600 else {refreshSnooze();return}
    checking=true;status="Checking for updates…"
    defer {checking=false}
    do {
      let config=URLSessionConfiguration.ephemeral;config.httpCookieStorage=nil;config.httpShouldSetCookies=false;config.timeoutIntervalForRequest=12;config.timeoutIntervalForResource=15
      let session=URLSession(configuration:config);defer{session.finishTasksAndInvalidate()}
      let (data,response)=try await session.data(for:URLRequest(url:URL(string:feed)!,cachePolicy:.reloadIgnoringLocalCacheData,timeoutInterval:12))
      guard let http=response as? HTTPURLResponse,http.statusCode==200,data.count<=65536,let object=try JSONSerialization.jsonObject(with:data) as? [String:Any],object["schema"] as? Int==1 else{throw URLError(.badServerResponse)}
      guard let entry=object[platform] else{throw URLError(.cannotParseResponse)}
      if entry is NSNull {version=nil;status="You’re up to date.";checkedAt=now;return}
      guard let release=entry as? [String:Any],let available=release["version"] as? String,let build=release["build"] as? String,
        let installed=Bundle.main.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String,
        let installedBuild=Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String,
        let v=Self.compare(available,installed),let b=Self.compare(build,installedBuild) else{throw URLError(.cannotParseResponse)}
      version=(v>0 || (v==0 && b>0)) ? available : nil;releaseKey=platform+":"+available+":"+build;refreshSnooze()
      status=version == nil ? "You’re up to date." : "Update available";checkedAt=now
    } catch {status="Could not check for updates. Try again when online.";checkedAt=now.addingTimeInterval(-20700)}
  }
  private func refreshSnooze(){let at=UserDefaults.standard.double(forKey:prefix+".dismissed"),now=Date().timeIntervalSince1970;snoozed=UserDefaults.standard.string(forKey:prefix+".release")==releaseKey && at>0 && at<=now && now-at<86400}
}
