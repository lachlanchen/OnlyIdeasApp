import UIKit
#if !targetEnvironment(macCatalyst)
import Capacitor
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if !targetEnvironment(macCatalyst)
        WatchSender.shared.activate()
        #endif
        UNUserNotificationCenter.current().delegate=ReadingReminder.shared
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

import UserNotifications
final class ReadingReminder:NSObject,UNUserNotificationCenterDelegate {
 static let shared=ReadingReminder()
 static func cancel(){UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:["onlyideas.daily"])}
 static func configure(_ p:ReadingPreferences)async->Bool {
  cancel();guard p.dailyEnabled else{return true}
  let center=UNUserNotificationCenter.current();guard (try? await center.requestAuthorization(options:[.alert,.sound,.badge]))==true else{return false}
  let parts=p.dailyTime.split(separator:":").compactMap{Int($0)};guard parts.count==2 else{return false}
  var date=DateComponents();date.hour=parts[0];date.minute=parts[1];date.timeZone=TimeZone(identifier:p.timezone)
  let content=UNMutableNotificationContent();content.title=T("Your daily reading time");content.body=T("Open For you to explore research matching your interests.");content.sound = .default
  do{try await center.add(UNNotificationRequest(identifier:"onlyideas.daily",content:content,trigger:UNCalendarNotificationTrigger(dateMatching:date,repeats:true)));return true}catch{return false}
 }
 func userNotificationCenter(_ center:UNUserNotificationCenter,didReceive response:UNNotificationResponse,withCompletionHandler completionHandler:@escaping()->Void){DispatchQueue.main.async{UserDefaults.standard.set(true,forKey:"onlyideas.open.daily");NotificationCenter.default.post(name:Notification.Name("OnlyIdeas.OpenSpace"),object:nil)};completionHandler()}
 func userNotificationCenter(_ center:UNUserNotificationCenter,willPresent notification:UNNotification,withCompletionHandler completionHandler:@escaping(UNNotificationPresentationOptions)->Void){completionHandler([.banner,.sound])}
}
