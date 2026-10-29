package art.onlyideas.app;
import static org.junit.Assert.*;
import android.content.Intent;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
@RunWith(AndroidJUnit4.class)
public class ReaderToolsTest {
 Object field(MainActivity a,String key)throws Exception{var f=MainActivity.class.getDeclaredField(key);f.setAccessible(true);return f.get(a);}
 String js(WebView view,String script)throws Exception{var i=InstrumentationRegistry.getInstrumentation();var latch=new CountDownLatch(1);var value=new AtomicReference<String>();i.runOnMainSync(()->view.evaluateJavascript(script,v->{value.set(v);latch.countDown();}));assertTrue(latch.await(10,TimeUnit.SECONDS));return value.get();}
 @Test public void nativeReaderSavesPrivateAnnotationsAndZoomsFigures() throws Exception {
  var i=InstrumentationRegistry.getInstrumentation();var context=i.getTargetContext();assertTrue(context.getPackageName().endsWith(".chatqa"));assertEquals("http://127.0.0.1:18649",NativeSession.ORIGIN);
  var api=new NativeSession(context);api.token(InstrumentationRegistry.getArguments().getString("fixtureToken"));
  var paper=api.json("/api/papers/native-reader-fixture","GET",null).getJSONObject("paper");
  var activity=(MainActivity)i.startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try{
   for(int n=0;n<100;n++){var account=(JSONObject)field(activity,"account");if(account!=null&&account.optString("id").equals("native-reader-qa"))break;Thread.sleep(100);}assertEquals("native-reader-qa",((JSONObject)field(activity,"account")).getString("id"));
   i.runOnMainSync(()->activity.openPaper(paper));
   for(int n=0;n<100&&field(activity,"reader")==null;n++)Thread.sleep(100);var view=(WebView)field(activity,"reader");assertNotNull(view);
   for(int n=0;n<100&&!"true".equals(js(view,"document.querySelector('#paper')?.dataset.ready==='true'"));n++)Thread.sleep(100);
   assertEquals("true",js(view,"document.querySelector('#paper').dataset.ready==='true'"));assertEquals("4",js(view,"document.querySelectorAll('.reader-tools>button').length"));
   js(view,"(()=>{const w=document.createTreeWalker(document.querySelector('#paper'),NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const at=n.textContent.indexOf('Optical imaging');if(at>=0){const r=document.createRange();r.setStart(n,at);r.setEnd(n,at+15);getSelection().removeAllRanges();getSelection().addRange(r);document.dispatchEvent(new Event('selectionchange'));break}}document.querySelector('.reader-selection button').click();return true})()");
   JSONObject saved=null;for(int n=0;n<80;n++){var rows=api.json("/api/papers/native-reader-fixture/annotations","GET",null).getJSONArray("annotations");if(rows.length()==1){saved=rows.getJSONObject(0);break;}Thread.sleep(100);}assertNotNull(saved);assertEquals("Optical imaging",saved.getString("quote"));
   for(int n=0;n<40&&!"1".equals(js(view,"document.querySelectorAll('mark[data-annotation]').length"));n++)Thread.sleep(100);
   js(view,"document.querySelector('mark[data-annotation]').click()");assertEquals("1",js(view,"document.querySelectorAll('.reader-dialog textarea').length"));
   js(view,"document.querySelector('.reader-dialog textarea').value='Private native note';[...document.querySelectorAll('.reader-dialog button')].find(b=>b.textContent==='Save').click()");
   for(int n=0;n<60;n++){saved=api.json("/api/papers/native-reader-fixture/annotations","GET",null).getJSONArray("annotations").getJSONObject(0);if(saved.getString("note").equals("Private native note"))break;Thread.sleep(100);}assertEquals("Private native note",saved.getString("note"));
   js(view,"document.querySelector('#paper img').click()");assertEquals("1",js(view,"document.querySelectorAll('.reader-image-viewport img').length"));
   var before=Double.parseDouble(js(view,"document.querySelector('.reader-image-viewport img').getBoundingClientRect().width"));js(view,"[...document.querySelectorAll('.reader-dialog button')].find(b=>b.textContent==='+').click()");assertTrue(Double.parseDouble(js(view,"document.querySelector('.reader-image-viewport img').getBoundingClientRect().width"))>before);
   js(view,"[...document.querySelectorAll('.reader-dialog button')].find(b=>b.textContent==='Close').click();[...document.querySelectorAll('.reader-tools>button')].find(b=>b.textContent==='Search').click();const input=document.querySelector('.reader-search input');input.value='imaging';input.dispatchEvent(new Event('input'))");assertTrue(Integer.parseInt(js(view,"document.querySelectorAll('mark.reader-match').length"))>=1);
   var bitmap=i.getUiAutomation().takeScreenshot();assertNotNull(bitmap);try(var out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"reader40-android.png"))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
  }finally{i.runOnMainSync(activity::finish);api.token(null);}
 }
}
