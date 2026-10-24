package art.onlyideas.app;
import static org.junit.Assert.*;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.*;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.*;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static org.hamcrest.Matchers.startsWith;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
@RunWith(AndroidJUnit4.class)
public class ResearchControlsTest {
 @Test public void selectTopicsJournalsAndRestoreSavedChoices() throws Exception {
  var ins=InstrumentationRegistry.getInstrumentation();var context=ins.getTargetContext();assertTrue(context.getPackageName().endsWith(".chatqa"));assertEquals("http://127.0.0.1:18649",NativeSession.ORIGIN);
  NativeSession api=new NativeSession(context);api.token("synthetic-interests37-token");api.json("/__qa/feed","POST",new JSONObject().put("reset",true));
  MainActivity activity=(MainActivity)ins.startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try {
   var f=MainActivity.class.getDeclaredField("account");f.setAccessible(true);for(int i=0;i<80&&f.get(activity)==null;i++)Thread.sleep(100);assertNotNull(f.get(activity));
   ins.runOnMainSync(activity::showReadingPreferences);Thread.sleep(600);ins.waitForIdleSync();
   onView(withText(startsWith("Topics ·"))).inRoot(isDialog()).perform(click());onView(withText("Microscopy")).inRoot(isDialog()).perform(click());onView(withText("Done")).inRoot(isDialog()).perform(click());
   onView(withText(startsWith("Journals ·"))).inRoot(isDialog()).perform(click());onView(withText("Nature")).inRoot(isDialog()).perform(click());onView(withText("Done")).inRoot(isDialog()).perform(click());
   onView(withContentDescription("Your interests")).inRoot(isDialog()).perform(scrollTo(),replaceText("polarization"),closeSoftKeyboard());
   var image=ins.getUiAutomation().takeScreenshot();try(var out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"research-controls.png"))){assertTrue(image.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}
   onView(withText("Save preferences")).inRoot(isDialog()).perform(scrollTo(),click());Thread.sleep(800);
   JSONObject prefs=api.json("/api/preferences","GET",null).getJSONObject("preferences");assertEquals("polarization",prefs.getString("interests"));assertTrue(prefs.getJSONArray("topics").toString().contains("microscopy"));assertFalse(prefs.getJSONArray("journals").toString().contains("S137773608"));
   ins.runOnMainSync(activity::showReadingPreferences);Thread.sleep(600);ins.waitForIdleSync();onView(withContentDescription("Your interests")).inRoot(isDialog()).check(matches(withText("polarization")));onView(withText("Cancel")).inRoot(isDialog()).perform(click());
  }finally{ins.runOnMainSync(activity::finish);api.token(null);}
 }
}
