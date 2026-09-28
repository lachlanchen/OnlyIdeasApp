import XCTest

final class NativeUITests: XCTestCase {
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
    let row=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Measuring holographic entanglement entropy on a quantum simulator")).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout:30));row.tap()
    XCTAssertTrue(app.webViews.buttons["Discuss paragraph"].firstMatch.waitForExistence(timeout:45))
    app.buttons["Reading options"].tap()
    XCTAssertTrue(app.buttons["Send excerpt to Watch"].waitForExistence(timeout:5))
    app.buttons["Send excerpt to Watch"].tap()
    XCTAssertTrue(app.alerts.firstMatch.waitForExistence(timeout:10))
    print("WATCH ALERT",app.alerts.firstMatch.debugDescription)
    shot("Watch13-transfer-alert")
    XCTAssertTrue(app.alerts.staticTexts["Excerpt queued. Open OnlyIdeas on your paired Apple Watch to read it offline."].waitForExistence(timeout:10))
    shot("Watch13-transfer-confirmed")
    app.alerts.buttons["OK"].tap()
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
    app.launchArguments = ["-onlyideas.native.language","en","-onlyideas.native.appearance","light"]
    app.launch()
    let title = "Measuring holographic entanglement entropy on a quantum simulator"
    let row = app.buttons.matching(NSPredicate(format:"label CONTAINS %@",title)).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout:30))
    shot("Final10-01-library")
    app.buttons["Agent"].firstMatch.tap()
    XCTAssertTrue(app.buttons["Attach files"].waitForExistence(timeout:10))
    shot("Final10-02-agent")
    app.buttons["Profile"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["Profile"].waitForExistence(timeout:10))
    shot("Final10-03-profile")
    app.buttons["Library"].firstMatch.tap();row.tap()
    XCTAssertTrue(app.webViews.staticTexts[title].waitForExistence(timeout:45))
    shot("Final10-04-reader")
    app.swipeUp();shot("Final10-05-equations")
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
