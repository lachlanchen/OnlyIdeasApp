package art.onlyideas.app;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.Intent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class RecommendationFeedTest {
  private final Instrumentation ins=InstrumentationRegistry.getInstrumentation();
  private Object field(MainActivity a,String name)throws Exception{var f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(a);}
  private boolean text(View v,String value){if(v instanceof TextView t&&value.contentEquals(t.getText()))return true;if(v instanceof ViewGroup g)for(int i=0;i<g.getChildCount();i++)if(text(g.getChildAt(i),value))return true;return false;}
  private void waitText(MainActivity a,String value)throws Exception{for(int i=0;i<100;i++){boolean[] found={false};ins.runOnMainSync(()->found[0]=text(a.getWindow().getDecorView(),value));if(found[0])return;Thread.sleep(100);}fail("Missing UI text: "+value);}
  private ScrollView scroll(View v){if(v instanceof ScrollView s)return s;if(v instanceof ViewGroup g)for(int i=0;i<g.getChildCount();i++){ScrollView s=scroll(g.getChildAt(i));if(s!=null)return s;}return null;}
  private MainActivity start(){return (MainActivity)ins.startActivitySync(new Intent(ins.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));}
  @Test public void reopenRefreshPaginationAndOfflinePreserveFeed()throws Exception{
    var context=ins.getTargetContext();assertTrue(context.getPackageName().endsWith(".chatqa"));assertEquals("http://127.0.0.1:18649",NativeSession.ORIGIN);
    NativeSession api=new NativeSession(context);api.token("synthetic-interests37-token");
    api.json("/__qa/feed","POST",new JSONObject().put("reset",true));
    new java.io.File(context.getCacheDir(),"recommendations-v1.json").delete();
    MainActivity activity=start();
    try{
      waitText(activity,"Recommendation cache paper 1");
      for(int i=0;i<100;i++){if(field(activity,"account")!=null&&!((Boolean)field(activity,"researchLoading")))break;Thread.sleep(100);}
      assertNotNull(field(activity,"account"));
      final MainActivity initial=activity;
      ins.runOnMainSync(()->scroll(initial.getWindow().getDecorView()).fullScroll(View.FOCUS_DOWN));
      waitText(activity,"Recommendation cache paper 9");
      JSONObject disk=RecommendationCache.read(activity.recommendationFile(),activity.recommendationScope(),System.currentTimeMillis());
      assertNotNull(disk);assertEquals(8,disk.getJSONArray("papers").length());assertEquals(2,disk.getInt("nextPage"));
      int requests=api.json("/__qa/feed","GET",null).getJSONArray("requests").length();
      api.json("/__qa/feed","POST",new JSONObject().put("offline",true));
      ins.runOnMainSync(initial::finish);ins.waitForIdleSync();activity=start();
      waitText(activity,"Recommendation cache paper 1");Thread.sleep(700);
      assertEquals(requests,api.json("/__qa/feed","GET",null).getJSONArray("requests").length());
      final MainActivity reopened=activity;
      api.json("/__qa/feed","POST",new JSONObject().put("offline",false).put("revision",2));
      ins.runOnMainSync(()->reopened.researchReset(true));waitText(activity,"Recommendation cache paper 101");
      boolean[] old={true};ins.runOnMainSync(()->old[0]=text(reopened.getWindow().getDecorView(),"Recommendation cache paper 1"));assertFalse(old[0]);
      api.json("/__qa/feed","POST",new JSONObject().put("offline",true));
      ins.runOnMainSync(()->reopened.researchReset(true));waitText(activity,"Try again");waitText(activity,"Recommendation cache paper 101");
      var bitmap=ins.getUiAutomation().takeScreenshot();try(var out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"recommendations39.png"))){assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}
      api.json("/__qa/feed","POST",new JSONObject().put("offline",false));
    }finally{final MainActivity last=activity;ins.runOnMainSync(last::finish);api.token(null);}
  }
}
