package art.onlyideas.app;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/** One bounded first page, replaced on refresh. Never stores older loaded pages. */
final class RecommendationCache {
  static final long FRESH_MS=300_000, MAX_AGE_MS=7*86_400_000L;
  static final int MAX_BYTES=512_000, MAX_ITEMS=60;
  static int next(JSONObject value) {
    int page=value.optInt("nextPage",0);return page>1&&page<=100?page:0;
  }
  private static byte[] readBytes(File file)throws Exception {
    try(FileInputStream input=new FileInputStream(file);ByteArrayOutputStream output=new ByteArrayOutputStream()){
      byte[] buffer=new byte[8192];int n;
      while((n=input.read(buffer))!=-1){if(output.size()+n>MAX_BYTES)throw new java.io.IOException("Cache too large");output.write(buffer,0,n);}
      return output.toByteArray();
    }
  }
  static JSONObject read(File file,String scope,long now) {
    try {
      if(!file.exists())return null;
      if(file.length()>MAX_BYTES){file.delete();return null;}
      JSONObject v=new JSONObject(new String(readBytes(file),StandardCharsets.UTF_8));
      JSONArray papers=v.optJSONArray("papers");long at=v.optLong("at",0);
      if(v.optInt("version")!=1||at<=0||at>now||now-at>MAX_AGE_MS||papers==null||papers.length()>MAX_ITEMS){file.delete();return null;}
      for(int i=0;i<papers.length();i++) {
        JSONObject p=papers.optJSONObject(i);
        if(p==null||!(p.opt("id") instanceof String)||!(p.opt("title") instanceof String)||!(p.opt("authors") instanceof String)||!(p.opt("source") instanceof String)){file.delete();return null;}
      }
      return scope.equals(v.optString("scope"))?v:null;
    }catch(Exception e){file.delete();return null;}
  }
  static void save(File file,String scope,JSONArray papers,int next,long now) {
    File stage=new File(file.getPath()+".tmp");
    try {
      if(papers.length()>MAX_ITEMS)return;
      byte[] bytes=new JSONObject().put("version",1).put("scope",scope).put("at",now).put("papers",papers).put("nextPage",next>1&&next<=100?next:0).toString().getBytes(StandardCharsets.UTF_8);
      if(bytes.length>MAX_BYTES)return;
      try(FileOutputStream output=new FileOutputStream(stage)){output.write(bytes);output.getFD().sync();}
      if(!stage.renameTo(file))throw new java.io.IOException("Cache write unavailable");
    }catch(Exception ignored){/* Optional cache must never prevent reading. */}
    finally{stage.delete();}
  }
}
