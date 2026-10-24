import XCTest
import UIKit

final class NativeUITests: XCTestCase {
  private func interestFixtureApp() -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-onlyideas.native.language", "en", "--onlyideas-space-qa", "--onlyideas-mac-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"] = "http://127.0.0.1:18649"
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"] = "synthetic-interests37-token"
    return app
  }
  private func feedControl(_ value: [String:Any]? = nil) throws -> [String:Any] {
    let done = expectation(description:"Synthetic feed control")
    var output: [String:Any] = [:]
    var issue: Error?
    var request = URLRequest(url:URL(string:"http://127.0.0.1:18649/__qa/feed")!)
    request.timeoutInterval=5
    if let value {
      request.httpMethod="POST";request.httpBody=try JSONSerialization.data(withJSONObject:value)
      request.setValue("Bearer synthetic-interests37-token",forHTTPHeaderField:"Authorization")
    }
    URLSession.shared.dataTask(with:request){data,_,error in
      defer{done.fulfill()};issue=error
      if let data {output=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] ?? [:]}
    }.resume()
    wait(for:[done],timeout:7)
    if let issue {throw issue};return output
  }
  func testRecommendationCacheReopenRefreshAndPagination() throws {
    continueAfterFailure=false
    _ = try feedControl(["reset":true])
    let app=interestFixtureApp();app.launch()
    defer {app.terminate()}
    let first=app.buttons["Recommendation cache paper 1"]
    XCTAssertTrue(first.waitForExistence(timeout:25))
    // Both server and app account have settled before testing persisted reopening.
    app.tabBars.buttons["Agent"].tap()
    XCTAssertTrue(app.buttons.matching(NSPredicate(format:"label IN %@",["What would you like to follow?","Reading interests"])).firstMatch.waitForExistence(timeout:15))
    app.tabBars.buttons["Library"].tap()
    XCTAssertTrue(first.waitForExistence(timeout:10));shot("Cache39-first-page")
    let second=app.buttons["Recommendation cache paper 9"]
    for _ in 0..<16 {if second.isHittable {break};app.swipeUp()}
    XCTAssertTrue(second.exists)
    let before=(try feedControl()["requests"] as? [[String:Any]] ?? []).filter{($0["page"] as? Int)==1}.count
    _ = try feedControl(["offline":true]);app.terminate();app.launch()
    XCTAssertTrue(first.waitForExistence(timeout:20))
    let after=(try feedControl()["requests"] as? [[String:Any]] ?? []).filter{($0["page"] as? Int)==1}.count
    XCTAssertEqual(before,after,"Reopening a fresh first page must not refetch it")
    _ = try feedControl(["offline":false,"revision":2])
    let refresh=app.buttons["Refresh"].firstMatch
    XCTAssertTrue(refresh.isHittable);refresh.tap()
    XCTAssertTrue(app.buttons["Recommendation cache paper 101"].waitForExistence(timeout:15))
    XCTAssertFalse(first.exists);shot("Cache39-refreshed")
    _ = try feedControl(["offline":true]);refresh.tap()
    let retry=app.buttons["Try again"]
    for _ in 0..<16 {if retry.isHittable {break};app.swipeUp()}
    XCTAssertTrue(retry.exists)
    let newest=app.buttons["Recommendation cache paper 101"]
    for _ in 0..<16 {if newest.isHittable {break};app.swipeDown()}
    XCTAssertTrue(newest.isHittable)
    let requests=try feedControl()["requests"] as? [[String:Any]] ?? []
    XCTAssertTrue(requests.contains{($0["page"] as? Int)==2})
    XCTAssertTrue(requests.contains{($0["refresh"] as? String)=="1"})
    _ = try feedControl(["offline":false])
  }
  func testInterestPromptPreservesDraft() {
    continueAfterFailure=false
    let app = interestFixtureApp()
    app.launch()
    defer {app.terminate()}
    let agent=app.tabBars.buttons["Agent"]
    XCTAssertTrue(agent.waitForExistence(timeout:30));agent.tap()
    let prompt=app.buttons["What would you like to follow?"]
    XCTAssertTrue(prompt.waitForExistence(timeout:15))
    let composer=app.textViews["Message the paper agent"]
    composer.tap();composer.typeText("Keep my unsent paper question")
    if app.buttons["Done"].firstMatch.exists {app.buttons["Done"].firstMatch.tap()}
    prompt.tap()
    let topics=app.textFields["Topics you enjoy"]
    XCTAssertTrue(topics.waitForExistence(timeout:10));topics.tap();topics.typeText("history, climate")
    shot("Interests37-editor")
    app.buttons["Save interests"].tap()
    XCTAssertTrue(app.buttons["Reading interests"].waitForExistence(timeout:15))
    XCTAssertEqual(composer.value as? String,"Keep my unsent paper question")
    app.buttons["Reading interests"].tap()
    XCTAssertTrue(topics.waitForExistence(timeout:10));XCTAssertEqual(topics.value as? String,"history, climate")
    app.buttons["Cancel"].tap()
    XCTAssertEqual(composer.value as? String,"Keep my unsent paper question")
    shot("Interests37-saved")
  }
  func testAdaptiveComposerPreservesDraft() {
    continueAfterFailure = false
    let app = interestFixtureApp()
    app.launch()
    defer { XCUIDevice.shared.orientation = .portrait; app.terminate() }
    let agent = app.tabBars.buttons["Agent"]
    XCTAssertTrue(agent.waitForExistence(timeout: 30)); agent.tap()
    // Account restoration clears account-scoped drafts. Wait for the synthetic
    // session and preferences before entering the draft we intend to preserve.
    let interests = app.buttons.matching(NSPredicate(format: "label IN %@", ["What would you like to follow?", "Reading interests"])).firstMatch
    XCTAssertTrue(interests.waitForExistence(timeout: 15))
    let editor = app.textViews["Message the paper agent"]
    XCTAssertTrue(editor.waitForExistence(timeout: 10))
    let draft = "Keep this research question while the reading window changes."
    editor.tap(); editor.typeText(draft)
    let done = app.buttons["Done"].firstMatch
    if done.exists { done.tap() }
    for orientation in [UIDeviceOrientation.landscapeLeft, .portrait, .landscapeRight, .portrait] {
      XCUIDevice.shared.orientation = orientation
      XCTAssertTrue(editor.waitForExistence(timeout: 10))
      XCTAssertEqual(editor.value as? String, draft)
      XCTAssertGreaterThan(editor.frame.width, 100)
      XCTAssertGreaterThanOrEqual(editor.frame.minX, app.frame.minX)
      XCTAssertLessThanOrEqual(editor.frame.maxX, app.frame.maxX)
      XCTAssertTrue(app.buttons["Attach files"].isHittable)
      XCTAssertTrue(app.buttons["Send message"].isHittable)
    }
    app.tabBars.buttons["Library"].tap(); agent.tap()
    XCTAssertEqual(editor.value as? String, draft)
    XCTAssertFalse(app.alerts.firstMatch.exists)
    shot("Interests37-adaptive-draft")
  }
  func testChatMessageLayout() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa","--onlyideas-mac-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let path=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa34-token")
    guard let token=try? String(contentsOf:path,encoding:.utf8) else {XCTFail("Missing synthetic QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Profile"].waitForExistence(timeout:30));app.tabBars.buttons["Profile"].tap()
    let balance=app.staticTexts["lac-balance"]
    XCTAssertTrue(balance.waitForExistence(timeout:15));XCTAssertEqual(balance.label,"45")
    shot("Test34-phone-lac-balance")
    app.tabBars.buttons["Agent"].tap()
    app.buttons["Conversation history"].tap()
    let chat=app.buttons["Chat layout verification"];XCTAssertTrue(chat.waitForExistence(timeout:15));chat.tap()
    let user=app.images["chat-avatar-qa-user"],assistant=app.images["chat-avatar-qa-assistant"]
    XCTAssertTrue(user.waitForExistence(timeout:15));XCTAssertTrue(assistant.exists)
    let scroll=app.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>120}.max{$0.frame.height<$1.frame.height}!
    scroll.swipeDown()
    for avatar in [user,assistant] {
      XCTAssertGreaterThanOrEqual(avatar.frame.width,32);XCTAssertGreaterThanOrEqual(avatar.frame.height,32)
      XCTAssertGreaterThanOrEqual(avatar.frame.minX,scroll.frame.minX+8)
      XCTAssertLessThanOrEqual(avatar.frame.maxX,scroll.frame.maxX-8)
    }
    XCTAssertGreaterThan(user.frame.midX,assistant.frame.midX+100)
    let assistantName=app.staticTexts.matching(identifier:"OnlyIdeas").allElementsBoundByIndex.filter{$0.frame.minY>assistant.frame.minY-4}.first!
    XCTAssertGreaterThan(assistantName.frame.minX,assistant.frame.maxX+8)
    let response="I found the paper in the research index. You can read the abstract or fetch its full text."
    XCTAssertTrue(app.descendants(matching:.any)["chat-text-qa-assistant"].exists)
    shot("Test34-phone-chat-light")
    app.buttons["chat-copy-qa-assistant"].tap()
    // Paste inside the same app; reading from the runner triggers an unrelated
    // cross-app clipboard permission sheet and can block the test process.
    let composer=app.textViews["Message the paper agent"]
    composer.tap();composer.press(forDuration:1.2)
    let paste=app.menuItems["Paste"]
    XCTAssertTrue(paste.waitForExistence(timeout:5));paste.tap()
    XCTAssertEqual(composer.value as? String,response)
    app.terminate()
  }
  func testOwnerPublicationAndCompactAttachment() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa","--onlyideas-mac-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let path=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa33-token")
    guard let token=try? String(contentsOf:path,encoding:.utf8) else {XCTFail("Missing synthetic QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Agent"].waitForExistence(timeout:30));app.tabBars.buttons["Agent"].tap()
    let attach=app.buttons["Attach files"].firstMatch
    XCTAssertTrue(attach.waitForExistence(timeout:10));XCTAssertLessThanOrEqual(attach.frame.width,48)
    let editor=app.textViews["Message the paper agent"]
    XCTAssertTrue(editor.exists);XCTAssertGreaterThan(editor.frame.width,attach.frame.width*3)
    shot("Test33-agent-compact")
    app.tabBars.buttons["Library"].tap();app.segmentedControls.buttons["Reading library"].tap()
    let paper=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Original native sharing check")).firstMatch
    XCTAssertTrue(paper.waitForExistence(timeout:20));paper.tap()
    let publish=app.buttons["Make public"].firstMatch
    XCTAssertTrue(publish.waitForExistence(timeout:30));shot("Test33-private-paper");publish.tap()
    let agree=app.switches["I confirm permission to share the text and all figures under this license."].firstMatch
    XCTAssertTrue(agree.waitForExistence(timeout:10));agree.switches.firstMatch.tap();XCTAssertEqual(agree.value as? String,"1");shot("Test33-publication-confirm")
    let confirm=app.buttons.matching(identifier:"Make public").allElementsBoundByIndex.last!
    XCTAssertTrue(confirm.isEnabled);confirm.tap()
    let closed=XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:app.buttons["Cancel"])
    XCTAssertEqual(XCTWaiter.wait(for:[closed],timeout:20),.completed)
    XCTAssertFalse(app.buttons["Make public"].exists)
    app.navigationBars.buttons["OnlyIdeas"].tap()
    XCTAssertTrue(app.staticTexts["Shared — pending review"].waitForExistence(timeout:20));shot("Test33-publication-complete")
    app.terminate()
  }
  func testCompactAgentKeyboardAndTabs() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-mac-qa"]
    app.launch()
    let agent=app.tabBars.buttons["Agent"]
    XCTAssertTrue(agent.waitForExistence(timeout:30));agent.tap()
    let editor=app.textViews["Message the paper agent"]
    XCTAssertTrue(editor.waitForExistence(timeout:10));XCTAssertLessThan(editor.frame.height,64)
    shot("Test30-agent-compact")
    editor.tap();editor.typeText("Find optical imaging papers.\nCompare the methods.\nExplain the figures.")
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout:5));XCTAssertGreaterThan(editor.frame.height,40)
    guard let scroll=app.scrollViews.allElementsBoundByIndex.filter({$0.frame.height>120}).max(by:{$0.frame.height<$1.frame.height}) else {XCTFail("Missing message scroller");return}
    let start=scroll.coordinate(withNormalizedOffset:CGVector(dx:0.8,dy:0.18))
    let finish=scroll.coordinate(withNormalizedOffset:CGVector(dx:0.8,dy:0.85))
    start.press(forDuration:0.1,thenDragTo:finish)
    let folded=XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:app.keyboards.firstMatch)
    XCTAssertEqual(XCTWaiter.wait(for:[folded],timeout:8),.completed)
    shot("Test30-agent-keyboard-dismissed")
    app.tabBars.buttons["Library"].tap()
    XCTAssertTrue(app.segmentedControls.buttons["Reading library"].waitForExistence(timeout:10))
    XCTAssertFalse(app.keyboards.firstMatch.exists)
    shot("Test30-library-return")
    agent.tap();XCTAssertTrue((editor.value as? String ?? "").contains("optical imaging"))
    app.terminate()
  }
  func testPlansVisibleWithoutPurchaseActivation() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Profile"].waitForExistence(timeout:20));app.tabBars.buttons["Profile"].tap()
    let entry=app.buttons["plans-entry"];XCTAssertTrue(entry.waitForExistence(timeout:10));shot("Plans21-profile");entry.tap()
    XCTAssertTrue(app.staticTexts["Subscriptions are coming soon. You can keep reading for free."].waitForExistence(timeout:20))
    XCTAssertTrue(app.staticTexts["200 transcription pages · 60 new-paper fetches per month"].exists)
    XCTAssertTrue(app.buttons["Coming soon"].firstMatch.exists);XCTAssertFalse(app.buttons["Coming soon"].firstMatch.isEnabled)
    shot("Plans21-visible")
    app.terminate()
  }
  func testIntegratedTranslationReader() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let path=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa-token")
    guard let token=try? String(contentsOf:path,encoding:.utf8) else{XCTFail("Missing private QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Your space"].waitForExistence(timeout:20));app.tabBars.buttons["Your space"].tap()
    XCTAssertTrue(app.buttons["Liked"].waitForExistence(timeout:15));app.buttons["Liked"].tap()
    XCTAssertTrue(app.buttons["Open paper"].firstMatch.waitForExistence(timeout:15));app.buttons["Open paper"].firstMatch.tap()
    XCTAssertTrue(app.buttons["Interlaced"].waitForExistence(timeout:30));app.buttons["Interlaced"].tap()
    XCTAssertTrue(app.staticTexts["AI translation · 324/324"].waitForExistence(timeout:30))
    app.webViews.firstMatch.swipeUp();shot("Reader20-interlaced")
    XCTAssertTrue(app.webViews.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","简体中文 · AI translation")).firstMatch.exists)
    app.buttons["Translation"].tap();shot("Reader20-translation")
    app.buttons["Original"].tap();shot("Reader20-original")
    XCTAssertTrue(app.webViews.buttons["Discuss paragraph"].firstMatch.exists)
    app.terminate()
  }
  func testSavedAgentResult() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let path=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa-token")
    guard let token=try? String(contentsOf:path,encoding:.utf8) else{XCTFail("Missing private QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Agent"].waitForExistence(timeout:20));app.tabBars.buttons["Agent"].tap()
    app.buttons["Conversation history"].tap()
    XCTAssertTrue(app.buttons["Agent result verification"].waitForExistence(timeout:15));app.buttons["Agent result verification"].tap()
    XCTAssertTrue(app.buttons["Open result"].waitForExistence(timeout:15));app.buttons["Open result"].tap()
    XCTAssertTrue(app.webViews.staticTexts["Saved reading result"].waitForExistence(timeout:30))
    shot("Agent19-saved-result")
    app.terminate()
  }
  func testPieceTranslationControls() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let path=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa-token")
    guard let token=try? String(contentsOf:path,encoding:.utf8) else{XCTFail("Missing private QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Your space"].waitForExistence(timeout:20));app.tabBars.buttons["Your space"].tap()
    XCTAssertTrue(app.buttons["Liked"].waitForExistence(timeout:15));app.buttons["Liked"].tap()
    XCTAssertTrue(app.buttons["Open paper"].firstMatch.waitForExistence(timeout:15));app.buttons["Open paper"].firstMatch.tap()
    XCTAssertTrue(app.webViews.buttons["Discuss paragraph"].firstMatch.waitForExistence(timeout:40))
    app.buttons["Reading options"].tap();app.buttons["Notes, guides & translation"].tap()
    let link=app.buttons["Translate a paragraph or sentence"];if !link.isHittable {app.swipeUp()};XCTAssertTrue(link.waitForExistence(timeout:15));link.tap()
    XCTAssertTrue(app.buttons["Translate this passage"].waitForExistence(timeout:15));shot("Recovery17-piece-controls")
    XCTAssertTrue(app.staticTexts["Only missing pieces use the model. Saved translations are reused."].exists)
    app.terminate()
  }
  func testReadingSpacePreferences() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-space-qa"]
    app.launchEnvironment["ONLYIDEAS_QA_ORIGIN"]="http://127.0.0.1:18649"
    let tokenURL=URL(fileURLWithPath:NSHomeDirectory()).appendingPathComponent("Documents/onlyideas-qa-token")
    guard let token=try? String(contentsOf:tokenURL,encoding:.utf8) else {XCTFail("Missing private QA token");return}
    app.launchEnvironment["ONLYIDEAS_QA_TOKEN"]=token.trimmingCharacters(in:.whitespacesAndNewlines)
    app.launch()
    XCTAssertTrue(app.tabBars.buttons["Your space"].waitForExistence(timeout:20));app.tabBars.buttons["Your space"].tap()
    XCTAssertTrue(app.buttons["Liked"].waitForExistence(timeout:15));app.buttons["Liked"].tap()
    XCTAssertTrue(app.buttons["Open paper"].firstMatch.waitForExistence(timeout:15));shot("Space16-liked")
    app.buttons["Inbox"].tap();XCTAssertTrue(app.buttons["Mark all read"].waitForExistence(timeout:10));shot("Space16-inbox")
    app.buttons["Mark all read"].tap();app.buttons["Activity"].tap();XCTAssertTrue(app.staticTexts["Saved"].firstMatch.waitForExistence(timeout:10));shot("Space16-activity")
    app.buttons["Interests & notifications"].tap();XCTAssertTrue(app.textFields["Topics you enjoy"].waitForExistence(timeout:10));
    let field=app.textFields["Topics you enjoy"];field.tap();let old=field.value as? String ?? "";if !old.isEmpty {field.typeText(String(repeating:XCUIKeyboardKey.delete.rawValue,count:old.count))};field.typeText("quantum optics")
    app.swipeUp();let daily=app.switches["Daily reading reminder"].firstMatch;XCTAssertTrue(daily.waitForExistence(timeout:10));if daily.value as? String == "0" {daily.tap()}
    XCTAssertTrue(app.buttons["Save preferences"].waitForExistence(timeout:10));app.buttons["Save preferences"].tap()
    let allow=XCUIApplication(bundleIdentifier:"com.apple.springboard").buttons["Allow"];if allow.waitForExistence(timeout:5){allow.tap()}
    XCTAssertTrue(app.staticTexts["Preferences saved"].waitForExistence(timeout:10));shot("Space16-preferences")
    app.buttons["Done"].tap()
    app.terminate()
  }
  func testWatchTransfer() {
    continueAfterFailure=false
    let app=XCUIApplication()
    app.launchArguments=["-onlyideas.native.language","en","-onlyideas.native.appearance","light"]
    app.launch()
    XCTAssertTrue(app.segmentedControls.buttons["Reading library"].waitForExistence(timeout:20))
    app.segmentedControls.buttons["Reading library"].tap()
    let row=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Measuring holographic entanglement entropy on a quantum simulator")).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout:30));row.tap()
    XCTAssertTrue(app.webViews.buttons["Discuss paragraph"].firstMatch.waitForExistence(timeout:45))
    XCTAssertTrue(app.buttons["reader.sendToWatch"].waitForExistence(timeout:10))
    expectation(for:NSPredicate(format:"enabled == true"),evaluatedWith:app.buttons["reader.sendToWatch"]);waitForExpectations(timeout:45)
    for edition in ["Original","Translation","Interlaced"] {
      app.buttons["reader.sendToWatch"].tap()
      let choice=app.buttons["watch.edition."+edition.lowercased()]
      XCTAssertTrue(choice.waitForExistence(timeout:10))
      let enabled=NSPredicate(format:"enabled == true")
      expectation(for:enabled,evaluatedWith:choice);waitForExpectations(timeout:40)
      choice.tap()
      XCTAssertTrue(app.alerts.staticTexts["Excerpt queued. Open OnlyIdeas on your paired Apple Watch to read it offline."].waitForExistence(timeout:10))
      shot("Watch24-"+edition)
      app.alerts.buttons["OK"].tap()
    }
  }
  func testElevenLanguagesAndThemes() {
    continueAfterFailure = false
    let names = [("en","Library","Agent","Profile"),("zh-Hans","文库","智能助手","个人资料"),("zh-Hant","文庫","智慧助手","個人檔案"),("ja","ライブラリ","エージェント","プロフィール"),("ko","라이브러리","에이전트","프로필"),("ar","المكتبة","المساعد","الملف الشخصي"),("es","Biblioteca","Agente","Perfil"),("fr","Bibliothèque","Agent","Profil"),("de","Bibliothek","Agent","Profil"),("ru","Библиотека","Агент","Профиль"),("vi","Thư viện","Trợ lý","Hồ sơ")]
    let app = XCUIApplication()
    for (code,library,agent,profile) in names {
      for theme in ["light","dark"] {
        app.launchArguments = ["-onlyideas.native.language",code,"-onlyideas.native.appearance",theme]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons[library].waitForExistence(timeout:20),code)
        app.tabBars.buttons[profile].tap()
        XCTAssertTrue(app.navigationBars[profile].waitForExistence(timeout:5),code)
        shot("Profile-"+code+"-"+theme)
        app.tabBars.buttons[agent].tap()
        shot("Agent-"+code+"-"+theme)
        app.terminate()
      }
    }
  }
  func testResearchDiscoveryAndPaperActions() {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launchArguments = ["-onlyideas.native.language","en","-onlyideas.native.appearance","light"]
    app.launch()
    XCTAssertTrue(app.buttons["Filters"].waitForExistence(timeout:20))
    XCTAssertTrue(app.buttons["Fetch & read"].firstMatch.waitForExistence(timeout:40))
    shot("Discovery15-latest")
    app.buttons["Filters"].tap()
    XCTAssertTrue(app.buttons["Clear filters"].waitForExistence(timeout:10))
    shot("Discovery15-filters")
    app.buttons["Filters"].tap()
    let search=app.searchFields.firstMatch
    if !search.isHittable {app.swipeDown()}
    XCTAssertTrue(search.waitForExistence(timeout:10));search.tap();search.typeText("holograpic")
    let title="Measuring holographic entanglement entropy on a quantum simulator"
    let match=app.buttons.matching(NSPredicate(format:"label CONTAINS %@",title)).firstMatch
    XCTAssertTrue(match.waitForExistence(timeout:10))
    shot("Discovery15-local-fuzzy")
    if app.buttons["Cancel"].exists {app.buttons["Cancel"].tap()}
    app.buttons["Reading library"].tap()
    XCTAssertTrue(app.buttons["Comment"].firstMatch.waitForExistence(timeout:10))
    app.buttons["Comment"].firstMatch.tap()
    XCTAssertTrue(app.textViews["Your comment"].waitForExistence(timeout:10))
    XCTAssertTrue(app.buttons["Post thought"].isHittable)
    XCTAssertEqual(app.keyboards.count,0)
    shot("Discovery15-paper-discussion")
    app.buttons["Done"].firstMatch.tap()
  }

  func testParagraphDiscussionAndTranslationMenu() {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launchArguments = ["-onlyideas.native.language","en","-onlyideas.native.appearance","light"]
    app.launch()
    XCTAssertTrue(app.buttons["Reading library"].waitForExistence(timeout:15));app.buttons["Reading library"].tap()
    let row=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Measuring holographic entanglement entropy on a quantum simulator")).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout:30));shot("Store10-library");row.tap()
    let paragraph=app.webViews.buttons["Discuss paragraph"].firstMatch
    XCTAssertTrue(paragraph.waitForExistence(timeout:45));paragraph.tap()
    XCTAssertTrue(app.navigationBars["Discussion"].waitForExistence(timeout:10));shot("Store10-paragraph-discussion")
    XCTAssertTrue(app.buttons["Post thought"].isHittable, "Discussion must open at the bottom after loading")
    XCTAssertTrue(app.textViews["Your comment"].isHittable, "Composer should be visible without scrolling")
    app.buttons["Done"].firstMatch.tap()
    app.buttons["Reading options"].tap();app.buttons["Read in another language"].tap()
    XCTAssertTrue(app.navigationBars["Read in another language"].waitForExistence(timeout:10));shot("Store10-paper-languages")
    app.buttons["Done"].firstMatch.tap();shot("Store10-reader")
    app.tabBars.buttons["Agent"].tap();app.buttons["Attach files"].tap()
    XCTAssertTrue(app.buttons["Choose files"].waitForExistence(timeout:5));XCTAssertTrue(app.buttons["Choose photo"].exists);shot("Store10-attachment-menu")
  }

  func testFinalStoreScreens() {
    continueAfterFailure = false
    let app = XCUIApplication()
    // Existing DEBUG isolation skips stored account tokens and uses a public-only cache.
    app.launchArguments = ["-onlyideas.native.language","en","-onlyideas.native.appearance","light","--onlyideas-mac-qa"]
    app.launch()
    let library = app.segmentedControls.buttons["Reading library"]
    XCTAssertTrue(library.waitForExistence(timeout:30))
    XCTAssertTrue(app.buttons["Filters"].waitForExistence(timeout:15))
    let discoveryAction = app.buttons.matching(NSPredicate(format:"label == %@ OR label == %@", "Open paper", "Fetch & read")).firstMatch
    XCTAssertTrue(discoveryAction.waitForExistence(timeout:45))
    shot("Store29-01-discovery")
    library.tap()
    let title = "Measuring holographic entanglement entropy on a quantum simulator"
    let row = app.buttons.matching(NSPredicate(format:"label CONTAINS %@",title)).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout:30))
    shot("Store29-02-library")
    app.buttons["Agent"].firstMatch.tap()
    XCTAssertTrue(app.buttons["Attach files"].waitForExistence(timeout:10))
    shot("Store29-03-agent")
    app.buttons["Profile"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["Profile"].waitForExistence(timeout:10))
    XCTAssertTrue(app.buttons["Sign in"].exists)
    shot("Store29-profile")
    app.buttons["Library"].firstMatch.tap();row.tap()
    XCTAssertTrue(app.webViews.staticTexts[title].waitForExistence(timeout:45))
    XCTAssertTrue(app.webViews.buttons["Discuss paragraph"].firstMatch.waitForExistence(timeout:30))
    shot("Store29-04-reader")
    app.buttons["Interlaced"].tap()
    let translated = app.webViews.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","AI translation")).firstMatch
    XCTAssertTrue(translated.waitForExistence(timeout:30))
    // Let the WebKit and native compositor finish the reading-mode transition.
    // A scroll position alone is not evidence that an equation is on screen.
    Thread.sleep(forTimeInterval:3)
    shot("Store29-06-interlaced")
    app.terminate()
  }

  func testAutomaticCacheAndCompactReader() {
    continueAfterFailure = false
    let app = XCUIApplication()
    let title = "Measuring holographic entanglement entropy on a quantum simulator"
    app.launch()
    let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout: 30)); row.tap()
    XCTAssertTrue(app.webViews.staticTexts[title].waitForExistence(timeout: 45))
    shot("Compact real paper cached automatically")
    app.swipeLeft()
    shot("Reader after horizontal gesture")
    app.terminate()
    app.launchArguments = ["--onlyideas-native-offline"]
    app.launch()
    XCTAssertTrue(app.staticTexts["Offline · cached papers"].waitForExistence(timeout: 15))
    let saved = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    XCTAssertTrue(saved.waitForExistence(timeout: 10)); saved.tap()
    XCTAssertTrue(app.webViews.staticTexts[title].waitForExistence(timeout: 10))
    shot("Automatic cache after offline cold launch")
  }

  func testAccessibleStoreScreens() {
    continueAfterFailure = false
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.launch()
    let accessibility = settings.staticTexts["Accessibility"]
    for _ in 0..<5 {
      if accessibility.exists && accessibility.isHittable { break }
      settings.swipeUp()
    }
    XCTAssertTrue(accessibility.waitForExistence(timeout: 10))
    accessibility.tap()
    settings.staticTexts["Display & Text Size"].tap()
    let transparency = settings.switches["Reduce Transparency"]
    XCTAssertTrue(transparency.waitForExistence(timeout: 5))
    if transparency.value as? String == "0" { transparency.tap() }
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.buttons["Open profile"].waitForExistence(timeout: 20))
    shot("Store library with Reduce Transparency")
    app.buttons["Open profile"].tap()
    shot("Store profile with Reduce Transparency")
    app.tabBars.buttons["Agent"].tap()
    shot("Store agent with Reduce Transparency")
    app.tabBars.buttons["Library"].tap()
    let paper = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "A place for questions")).firstMatch
    XCTAssertTrue(paper.waitForExistence(timeout: 10))
    paper.tap()
    XCTAssertTrue(app.webViews.staticTexts["A place for questions"].waitForExistence(timeout: 20))
    shot("Store reading with Reduce Transparency")
  }
  func testAccountOptions() {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.buttons["Open profile"].waitForExistence(timeout: 20))
    app.buttons["Open profile"].tap()
    XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 5))
    app.buttons["Sign in"].tap()
    XCTAssertTrue(app.buttons["Continue with Apple"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Continue with GitHub"].exists)
    shot("Native account choices")
    app.buttons["Cancel"].tap()
  }
  func shot(_ name: String) {
    let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    a.name = name
    a.lifetime = .keepAlways
    add(a)
  }
  func testNativeNavigationAndReader() {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.buttons["Open profile"].waitForExistence(timeout: 20))
    shot("Native library")
    app.buttons["Open profile"].tap()
    XCTAssertTrue(app.navigationBars["Profile"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.sliders["Reading text size"].exists)
    shot("Profile and large text")
    XCTAssertTrue(app.tabBars.buttons["Agent"].exists)
    app.tabBars.buttons["Agent"].tap()
    XCTAssertTrue(app.textViews["Message the paper agent"].waitForExistence(timeout: 5))
    app.textViews["Message the paper agent"].tap()
    app.textViews["Message the paper agent"].typeText("Find quantum papers")
    shot("Native composer and keyboard")
    app.toolbars.buttons["Done"].tap()
    app.tabBars.buttons["Library"].tap()
    let paper = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A place for questions")
    ).firstMatch
    XCTAssertTrue(paper.waitForExistence(timeout: 10))
    paper.tap()
    XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 10))
    XCTAssertTrue(app.webViews.staticTexts["A place for questions"].waitForExistence(timeout: 20))
    shot("Native paper renderer")
    app.buttons["Reading options"].tap()
    if app.buttons["Read offline"].exists { app.buttons["Read offline"].tap() } else { app.tap() }
    app.terminate()
    app.launchArguments = ["--onlyideas-native-offline"]
    app.launch()
    XCTAssertTrue(app.staticTexts["Offline · downloaded papers"].waitForExistence(timeout: 10))
    let saved = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A place for questions")
    ).firstMatch
    XCTAssertTrue(saved.waitForExistence(timeout: 10))
    saved.tap()
    XCTAssertTrue(app.webViews.staticTexts["A place for questions"].waitForExistence(timeout: 20))
    shot("Native offline cold launch")
  }
}
