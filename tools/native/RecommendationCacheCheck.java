package art.onlyideas.app;
import java.nio.file.Files;
import org.json.*;
public final class RecommendationCacheCheck {
 public static void main(String[] args)throws Exception{
  var dir=Files.createTempDirectory("onlyideas-cache-qa");var file=dir.resolve("feed.json").toFile();long now=System.currentTimeMillis();
  var paper=new JSONObject().put("id","a").put("title","Research").put("authors","Tester").put("source","https://example.org/a");
  try{
   RecommendationCache.save(file,"alice",new JSONArray().put(paper),2,now);
   if(RecommendationCache.read(file,"alice",now).getJSONArray("papers").length()!=1)throw new AssertionError("restart");
   if(RecommendationCache.next(RecommendationCache.read(file,"alice",now))!=2)throw new AssertionError("cursor");
   if(RecommendationCache.read(file,"bob",now)!=null)throw new AssertionError("account boundary");
   var bytes=Files.readAllBytes(file.toPath());var large=new JSONArray();for(int i=0;i<61;i++)large.put(paper);
   RecommendationCache.save(file,"alice",large,2,now);if(!java.util.Arrays.equals(bytes,Files.readAllBytes(file.toPath())))throw new AssertionError("item cap");
   RecommendationCache.save(file,"alice",new JSONArray().put(new JSONObject(paper.toString()).put("summary","界".repeat(180000))),2,now);if(!java.util.Arrays.equals(bytes,Files.readAllBytes(file.toPath())))throw new AssertionError("byte cap");
   for(int i=0;i<100;i++)RecommendationCache.save(file,"alice",new JSONArray().put(paper),2,now);if(dir.toFile().list().length!=1)throw new AssertionError("accumulation");
   if(RecommendationCache.read(file,"alice",now+RecommendationCache.MAX_AGE_MS+1)!=null||file.exists())throw new AssertionError("expiry");
   Files.writeString(file.toPath(),"bad json");if(RecommendationCache.read(file,"alice",now)!=null||file.exists())throw new AssertionError("corruption");
   System.out.println("PASS: restart, cursor, identity, 60 items, 512KB, replacement, expiry, corruption");
  }finally{file.delete();Files.delete(dir);}
 }
}
