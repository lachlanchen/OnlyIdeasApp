package art.onlyideas.app;

import static org.junit.Assert.*;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.*;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.*;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import android.content.Intent;
import android.widget.EditText;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class InterestPromptTest {
  private Object field(MainActivity activity,String name) throws Exception {
    var f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);
  }
  private void set(MainActivity activity,String name,Object value) throws Exception {
    var f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);f.set(activity,value);
  }
  @Test public void promptAndEditorPreserveResearchDraft() throws Exception {
    var instrumentation=InstrumentationRegistry.getInstrumentation();var context=instrumentation.getTargetContext();
    assertTrue(context.getPackageName().endsWith(".chatqa"));
    MainActivity activity=(MainActivity)instrumentation.startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    try {
      // Inject only local UI state; no login or preference POST reaches a server.
      instrumentation.runOnMainSync(()->{try {
        activity.showAgent();
        set(activity,"account",new JSONObject().put("id","interest-ui-fixture"));
        set(activity,"recommendations",new JSONObject().put("state","pending").put("interests",""));
        set(activity,"recommendationsEpoch",field(activity,"authEpoch"));
        ((EditText)field(activity,"composer")).setText("Keep my unsent paper question");
        activity.renderMessages();
      }catch(Exception e){throw new RuntimeException(e);}});
      instrumentation.waitForIdleSync();
      onView(withText("What would you like to follow?")).check(matches(isDisplayed()));
      onView(withText("Not now")).check(matches(isDisplayed()));
      instrumentation.runOnMainSync(activity::editInterests);
      onView(withContentDescription("Topics you enjoy")).inRoot(isDialog()).perform(replaceText("history, climate"),closeSoftKeyboard());
      var shot=instrumentation.getUiAutomation().takeScreenshot();
      try(var out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"interests37-editor.png"))){assertTrue(shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}
      onView(withText("Cancel")).inRoot(isDialog()).perform(click());
      assertEquals("Keep my unsent paper question",((EditText)field(activity,"composer")).getText().toString());
      instrumentation.runOnMainSync(()->{try {
        set(activity,"recommendations",new JSONObject().put("state","chosen").put("interests","history, climate"));activity.renderMessages();activity.editInterests();
      }catch(Exception e){throw new RuntimeException(e);}});
      onView(withContentDescription("Topics you enjoy")).inRoot(isDialog()).check(matches(withText("history, climate")));
      onView(withText("Cancel")).inRoot(isDialog()).perform(click());
      assertEquals("Keep my unsent paper question",((EditText)field(activity,"composer")).getText().toString());
    }finally{instrumentation.runOnMainSync(()->{try{set(activity,"account",null);}catch(Exception e){throw new RuntimeException(e);}activity.finish();});}
  }
}
