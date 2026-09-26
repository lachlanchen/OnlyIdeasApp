package art.onlyideas.app;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeSessionTest {
  @Test
  public void encryptedValuesSurviveRecreationAndRemoval() throws Exception {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    NativeSession session = new NativeSession(context);
    String key = "onlyideas.qa.ephemeral", value = NativeSession.random();
    try {
      session.set(key, value);
      assertEquals(value, new NativeSession(context).get(key));
      assertFalse(
          context
              .getSharedPreferences("WSSecureStorageSharedPreferences", 0)
              .getString("capacitor-storage_" + key, "")
              .contains(value));
      session.set(key, null);
      assertNull(new NativeSession(context).get(key));
    } finally {
      session.set(key, null);
    }
  }

  // Explicit device-QA bridge: URL only, no verifier/token, in this debug app's private files.
  // The automation deletes the file after opening the owner's existing signed-in browser.
  @Test
  public void handOffPendingBrowserSignIn() throws Exception {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    String raw = new NativeSession(context).get("onlyideas.native.flow");
    org.junit.Assume.assumeNotNull(raw);
    JSONObject flow = new JSONObject(raw);
    assertTrue(
        flow.getString("url").startsWith("https://agent.onlyideas.art/api/auth/github?flow="));
    try (FileOutputStream out =
        new FileOutputStream(new File(context.getFilesDir(), "qa-oauth-url.json"))) {
      out.write(
          new JSONObject()
              .put("url", flow.getString("url"))
              .toString()
              .getBytes(StandardCharsets.UTF_8));
    }
  }
}
