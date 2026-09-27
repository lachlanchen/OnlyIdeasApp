import XCTest

final class NativeUITests: XCTestCase {
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
