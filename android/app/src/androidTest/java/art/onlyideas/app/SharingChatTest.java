package art.onlyideas.app;

import static org.junit.Assert.*;
import android.content.Intent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.ArrayList;

@RunWith(AndroidJUnit4.class)
public class SharingChatTest {
  private void named(View view,String label,ArrayList<View> result){
    if(label.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))result.add(view);
    if(view instanceof ViewGroup group)for(int i=0;i<group.getChildCount();i++)named(group.getChildAt(i),label,result);
  }
  private Object field(MainActivity activity,String name) throws Exception {var f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
  @Test public void bothQuotesAndPaperContextSurviveRotation() throws Exception {
    var instrumentation=InstrumentationRegistry.getInstrumentation();var context=instrumentation.getTargetContext();assertTrue(context.getPackageName().endsWith(".chatqa"));
    MainActivity activity=(MainActivity)instrumentation.startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    try{
      JSONArray messages=new JSONArray().put(new JSONObject().put("id","quote-user").put("role","user").put("text","Compare the imaging methods.")).put(new JSONObject().put("id","quote-assistant").put("role","assistant").put("text","Use the saved source to check the method."));
      instrumentation.runOnMainSync(()->{try{var f=MainActivity.class.getDeclaredField("chatMessages");f.setAccessible(true);f.set(activity,messages);activity.showAgent();}catch(Exception e){throw new RuntimeException(e);}});instrumentation.waitForIdleSync();
      instrumentation.runOnMainSync(()->{try{
        ArrayList<View> quotes=new ArrayList<>();named(activity.getWindow().getDecorView(),"Quote message",quotes);assertEquals(2,quotes.size());
        quotes.get(0).performClick();assertEquals("quote-user",((JSONObject)field(activity,"draftQuote")).getString("id"));
        quotes.get(1).performClick();assertEquals("quote-assistant",((JSONObject)field(activity,"draftQuote")).getString("id"));
        @SuppressWarnings("unchecked") ArrayList<JSONObject> references=(ArrayList<JSONObject>)field(activity,"draftReferences");references.add(new JSONObject().put("id","saved-paper").put("title","Saved imaging paper"));activity.renderDraftAttachments();((EditText)field(activity,"composer")).setText("Keep the selected context");
      }catch(Exception e){throw new RuntimeException(e);}});
      instrumentation.runOnMainSync(()->activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
      for(int i=0;i<50&&activity.getResources().getConfiguration().orientation!=android.content.res.Configuration.ORIENTATION_LANDSCAPE;i++)Thread.sleep(100);instrumentation.waitForIdleSync();
      assertEquals("quote-assistant",((JSONObject)field(activity,"draftQuote")).getString("id"));assertEquals(1,((ArrayList<?>)field(activity,"draftReferences")).size());assertEquals("Keep the selected context",((EditText)field(activity,"composer")).getText().toString());
      instrumentation.runOnMainSync(()->{ArrayList<View> remove=new ArrayList<>();named(activity.getWindow().getDecorView(),"Remove quote",remove);assertEquals(1,remove.size());remove.get(0).performClick();});assertNull(field(activity,"draftQuote"));
    }finally{instrumentation.runOnMainSync(activity::finish);}
  }
}
