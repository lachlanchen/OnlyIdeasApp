package art.onlyideas.app;

import static org.junit.Assert.*;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ChatLayoutTest {
  private View avatar(View view,String label){
    if(label.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;
    if(view instanceof ViewGroup group)for(int i=0;i<group.getChildCount();i++){View found=avatar(group.getChildAt(i),label);if(found!=null)return found;}
    return null;
  }
  @Test public void messagesHaveVisibleAvatarsAndSeparateSides() throws Exception {
    var instrumentation=InstrumentationRegistry.getInstrumentation();
    var context=instrumentation.getTargetContext();
    // Use a separate QA application id; never replace or inspect the signed app.
    assertTrue(context.getPackageName().endsWith(".chatqa"));
    Intent intent=new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    MainActivity activity=(MainActivity)instrumentation.startActivitySync(intent);
    try{
      JSONArray messages=new JSONArray()
        .put(new JSONObject().put("id","qa-user").put("role","user").put("text","Find a paper about polarization imaging."))
        .put(new JSONObject().put("id","qa-assistant").put("role","assistant").put("text","I found the paper in the research index. You can read the abstract or fetch its full text."));
      instrumentation.runOnMainSync(()->{
        try {var field=MainActivity.class.getDeclaredField("chatMessages");field.setAccessible(true);field.set(activity,messages);}catch(Exception e){throw new RuntimeException(e);}
        activity.showAgent();
      });
      instrumentation.waitForIdleSync();
      instrumentation.runOnMainSync(()->{
        View root=activity.getWindow().getDecorView(),user=avatar(root,"You"),assistant=avatar(root,"OnlyIdeas");
        assertNotNull(user);assertNotNull(assistant);assertTrue(assistant instanceof ImageView);assertNotNull(((ImageView)assistant).getDrawable());
        assertTrue(user instanceof TextView);assertEquals(1,((TextView)user).getText().toString().codePointCount(0,((TextView)user).length()));
        Rect a=new Rect(),u=new Rect();assertTrue(assistant.getGlobalVisibleRect(a));assertTrue(user.getGlobalVisibleRect(u));
        assertEquals(assistant.getWidth(),a.width());assertEquals(assistant.getHeight(),a.height());
        assertEquals(user.getWidth(),u.width());assertEquals(user.getHeight(),u.height());
        assertTrue(u.centerX()>a.centerX()+activity.dp(100));
        assertTrue(a.left>=activity.dp(8));assertTrue(u.right<=root.getWidth()-activity.dp(8));
        View copy=avatar(root,"Copy message");assertNotNull(copy);assertTrue(copy.performClick());
        var clipboard=(android.content.ClipboardManager)activity.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
        assertEquals("Find a paper about polarization imaging.",clipboard.getPrimaryClip().getItemAt(0).getText().toString());
      });
      Bitmap shot=instrumentation.getUiAutomation().takeScreenshot();assertNotNull(shot);
      try(var out=new FileOutputStream(new File(context.getExternalFilesDir(null),"chat34-android.png"))){assertTrue(shot.compress(Bitmap.CompressFormat.PNG,100,out));}
    }finally{instrumentation.runOnMainSync(activity::finish);}
  }
}
