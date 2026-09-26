import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        #if DEBUG
        window?.rootViewController = ProcessInfo.processInfo.arguments.contains("--onlyideas-smoke") ? OnlyIdeasSmokeController() : CAPBridgeViewController()
        #else
        window?.rootViewController = CAPBridgeViewController()
        #endif
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

#if DEBUG
import WebKit
final class OnlyIdeasSmokeController: CAPBridgeViewController {
    private var smokeStarted = false
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !smokeStarted else { return }; smokeStarted = true
        if ProcessInfo.processInfo.arguments.contains("--onlyideas-offline") {
            let source = "const originalFetch=window.fetch;window.fetch=(input,options)=>String(typeof input==='string'?input:input.url).startsWith('https://agent.onlyideas.art')?Promise.reject(new TypeError('Offline test')):originalFetch(input,options);"
            bridge?.webView?.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            bridge?.webView?.reload()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.runSmoke() }
    }
    private func runSmoke() {
        guard let webView = bridge?.webView else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.runSmoke() }; return
        }
        webView.evaluateJavaScript("document.readyState === 'complete' && !!document.getElementById('root') && !!window.Capacitor") { ready, _ in
            if ready as? Bool == true { self.executeSmoke() }
            else { DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.runSmoke() } }
        }
    }
    private func executeSmoke() {
        let script = #"""
(async () => {
  const report = { platform: window.Capacitor?.getPlatform(), checks: [] };
  const wait = async (fn, label) => { const until = Date.now() + 90000; while (!fn()) { if (Date.now() > until) throw new Error('Timed out: ' + label); await new Promise(r => setTimeout(r, 250)); } };
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  const check = (label, ok) => { if (!ok) throw new Error(label); report.checks.push(label); };
  try {
    await wait(() => button('Open paper'), 'library');
    check('native iOS bridge', report.platform === 'ios');
    check('library fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const offline = !!document.querySelector('.connection-notice');
    button('Open paper').click();
    await wait(() => document.querySelector('.paper-content mjx-container') && [...document.querySelectorAll('.paper-content img')].some(i => i.complete && i.naturalWidth > 0), 'equation and figure');
    check('equations rendered', !!document.querySelector('.paper-content mjx-container svg'));
    check('figure preserved', [...document.querySelectorAll('.paper-content img')].every(i => i.complete && i.naturalWidth > 0));
    check('reader fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const before = parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize);
    document.querySelector('[aria-label="Increase text size"]').click();
    await wait(() => parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize) > before, 'text sizing');
    check('reader text control', true);
    if (!offline && button('Read offline')) { button('Read offline').click(); await wait(() => button('Downloaded · Remove'), 'offline download'); }
    check(offline ? 'download survives a disconnected cold launch' : 'paper and figures downloaded', !!button('Downloaded · Remove'));
    document.querySelector('[aria-label="Toggle discussion panel"]').click();
    await wait(() => document.querySelector('.reading-panel'), 'discussion panel');
    check('native discussion panel', true);
    document.querySelector('[aria-label="Close reading panel"]').click();
    report.ok = true;
  } catch (e) { report.ok = false; report.error = e.message; }
  window.__onlyideasSmoke = report;
})();

"""#
        bridge?.webView?.evaluateJavaScript("void " + script) { _, _ in self.pollSmoke(remaining: 120) }
    }
    private func pollSmoke(remaining: Int) {
        bridge?.webView?.evaluateJavaScript("JSON.stringify(window.__onlyideasSmoke || null)") { result, _ in
            if let value = result as? String, value != "null" {
                let root = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                try? value.write(to: root.appendingPathComponent("native-smoke.json"), atomically: true, encoding: .utf8)
            } else if remaining > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.pollSmoke(remaining: remaining - 1) }
            }
        }
    }
}
#endif
