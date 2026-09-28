package art.onlyideas.app;
import android.app.*;import android.content.*;import android.os.Build;import java.util.Calendar;
public class ReadingReminder extends BroadcastReceiver {
 static final String STORE="onlyideas.daily";
 static PendingIntent alarm(Context c){return PendingIntent.getBroadcast(c,16,new Intent(c,ReadingReminder.class).setAction(STORE),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void cancel(Context c){c.getSharedPreferences(STORE,0).edit().putBoolean("enabled",false).apply();((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(alarm(c));((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(16);}
 static void configure(Context c,boolean enabled,int h,int m,String title,String body){cancel(c);c.getSharedPreferences(STORE,0).edit().putBoolean("enabled",enabled).putInt("hour",h).putInt("minute",m).putString("title",title).putString("body",body).apply();schedule(c);}
 static void schedule(Context c){SharedPreferences p=c.getSharedPreferences(STORE,0);if(!p.getBoolean("enabled",false))return;Calendar next=Calendar.getInstance();next.set(Calendar.HOUR_OF_DAY,p.getInt("hour",9));next.set(Calendar.MINUTE,p.getInt("minute",0));next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);if(next.getTimeInMillis()<=System.currentTimeMillis())next.add(Calendar.DAY_OF_YEAR,1);((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),alarm(c));}
 @Override public void onReceive(Context c,Intent i){SharedPreferences p=c.getSharedPreferences(STORE,0);if(!p.getBoolean("enabled",false))return;if(STORE.equals(i.getAction())){
  NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(STORE,p.getString("title","OnlyIdeas"),NotificationManager.IMPORTANCE_DEFAULT));
  PendingIntent open=PendingIntent.getActivity(c,16,new Intent(c,MainActivity.class).putExtra(STORE,true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,STORE):new Notification.Builder(c);b.setSmallIcon(android.R.drawable.ic_menu_agenda).setContentTitle(p.getString("title","OnlyIdeas")).setContentText(p.getString("body","Open OnlyIdeas")).setContentIntent(open).setAutoCancel(true);
  if(Build.VERSION.SDK_INT<33||c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==android.content.pm.PackageManager.PERMISSION_GRANTED)manager.notify(16,b.build());
 }schedule(c);}
}
