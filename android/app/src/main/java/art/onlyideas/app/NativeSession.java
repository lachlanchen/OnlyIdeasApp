package art.onlyideas.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

final class NativeSession {
  static final class HttpError extends Exception {
    final int status;
    JSONObject details = new JSONObject();
    HttpError(int status, String message) { super(message); this.status = status; }
  }
  static final String ORIGIN = "https://agent.onlyideas.art";
  private final SharedPreferences prefs;
  private record Cached(String tag,byte[] bytes){}
  private final java.util.LinkedHashMap<String,Cached> cache=new java.util.LinkedHashMap<>();
  private String cacheIdentity;
  private synchronized Cached cached(String path,String identity){if(!java.util.Objects.equals(identity,cacheIdentity)){cache.clear();cacheIdentity=identity;}return cache.get(path);}
  private synchronized void remember(String path,String identity,String tag,byte[] bytes){if(!java.util.Objects.equals(identity,token())||tag==null||bytes.length>2_000_000)return;if(!java.util.Objects.equals(identity,cacheIdentity)){cache.clear();cacheIdentity=identity;}long total=bytes.length;for(Cached c:cache.values())total+=c.bytes.length;if(total>8_000_000||cache.size()>40)cache.clear();cache.put(path,new Cached(tag,bytes));}

  NativeSession(Context context) {
    prefs = context.getSharedPreferences("WSSecureStorageSharedPreferences", Context.MODE_PRIVATE);
  }

  synchronized String get(String key) {
    try {
      String name = "capacitor-storage_" + key;
      String stored = prefs.getString(name, null);
      if (stored == null) return null;
      String[] parts = stored.split("\u0010");
      KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
      ks.load(null);
      SecretKey secret = (SecretKey) ks.getKey(name, null);
      if (secret == null || parts.length != 2) return null;
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(
          Cipher.DECRYPT_MODE,
          secret,
          new GCMParameterSpec(128, Base64.decode(parts[1], Base64.NO_WRAP)));
      return new String(c.doFinal(Base64.decode(parts[0], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    } catch (Exception e) {
      return null;
    }
  }

  synchronized void set(String key, String value) throws Exception {
    String name = "capacitor-storage_" + key;
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (value == null) {
      prefs.edit().remove(name).apply();
      if (ks.containsAlias(name)) ks.deleteEntry(name);
      return;
    }
    SecretKey secret = (SecretKey) ks.getKey(name, null);
    if (secret == null) {
      KeyGenerator generator =
          KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      generator.init(
          new KeyGenParameterSpec.Builder(
                  name, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
              .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
              .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
              .build());
      secret = generator.generateKey();
    }
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, secret);
    String encoded =
        Base64.encodeToString(
                cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),
                Base64.NO_WRAP | Base64.NO_PADDING)
            + "\u0010"
            + Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP | Base64.NO_PADDING);
    prefs.edit().putString(name, encoded).apply();
  }

  String token() {
    try {
      String raw = get("onlyideas.session.v1");
      return raw == null ? null : (String) new org.json.JSONTokener(raw).nextValue();
    } catch (Exception e) {
      return null;
    }
  }

  void token(String token) throws Exception {
    set("onlyideas.session.v1", token == null ? null : JSONObject.quote(token));
  }

  JSONObject json(String path, String method, JSONObject body) throws Exception {
    return new JSONObject(
        new String(
            bytes(
                path,
                method,
                body == null ? null : body.toString().getBytes(StandardCharsets.UTF_8),
                "application/json",
                null),
            StandardCharsets.UTF_8));
  }

  JSONObject jsonBound(String path,String method,JSONObject body,String expectedToken) throws Exception {
    return new JSONObject(new String(bytesBound(path,method,body==null?null:body.toString().getBytes(StandardCharsets.UTF_8),"application/json",null,expectedToken,true),StandardCharsets.UTF_8));
  }
  byte[] bytes(
      String path, String method, byte[] body, String type, java.util.Map<String, String> headers)
      throws Exception {return bytesBound(path,method,body,type,headers,null,false);}
  private byte[] bytesBound(String path,String method,byte[] body,String type,java.util.Map<String,String> headers,String expectedToken,boolean bound) throws Exception {
    HttpURLConnection c = (HttpURLConnection) new URL(ORIGIN + path).openConnection();
    c.setConnectTimeout(20000);
    c.setReadTimeout(65000);
    c.setInstanceFollowRedirects(false);
    c.setRequestMethod(method);
    c.setRequestProperty("Origin", "https://localhost");
    c.setRequestProperty("X-OnlyIdeas-Client", "native");
    String token = token();
    if(bound&&!java.util.Objects.equals(token,expectedToken)){c.disconnect();throw new Exception("Account changed. Please try again.");}
    Cached saved=method.equals("GET")?cached(path,token):null;
    if(saved!=null)c.setRequestProperty("If-None-Match",saved.tag());
    if (token != null) c.setRequestProperty("Authorization", "Bearer " + token);
    if (headers != null) headers.forEach(c::setRequestProperty);
    try {
      if (body != null) {
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", type);
        c.setFixedLengthStreamingMode(body.length);
        try (var out = c.getOutputStream()) {
          out.write(body);
        }
      }
      int code = c.getResponseCode();
      if(!java.util.Objects.equals(token,token()))throw new Exception("Account changed. Please try again.");
      if(code==304&&saved!=null)return saved.bytes();
      try (var input = code >= 200 && code < 300 ? c.getInputStream() : c.getErrorStream();
          var output = new ByteArrayOutputStream()) {
        if (input == null) throw new Exception("Connection interrupted. Please try again.");
        byte[] buffer = new byte[8192];
        int n;
        while ((n = input.read(buffer)) != -1) {
          if (output.size() + n > 70_000_000) throw new Exception("This response is too large.");
          output.write(buffer, 0, n);
        }
        byte[] data = output.toByteArray();
        if (code < 200 || code >= 300) {
          String message = "Connection interrupted. Please try again.";
          try {
            message =
                new JSONObject(new String(data, StandardCharsets.UTF_8))
                    .optString("error", message);
          } catch (Exception ignored) {
          }
          HttpError error=new HttpError(code,message);try{error.details=new JSONObject(new String(data,StandardCharsets.UTF_8));}catch(Exception ignored){}throw error;
        }
        if(method.equals("GET"))remember(path,token,c.getHeaderField("ETag"),data);
        return data;
      }
    } finally {
      c.disconnect();
    }
  }

  static String random() {
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
  }
}
