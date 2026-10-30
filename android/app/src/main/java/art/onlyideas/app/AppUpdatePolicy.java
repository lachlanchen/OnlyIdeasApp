package art.onlyideas.app;
public final class AppUpdatePolicy {
  private AppUpdatePolicy(){}
  public static int compare(String a,String b){
    if(a==null||b==null||!a.matches("[0-9]{1,8}(\\.[0-9]{1,8}){0,3}")||!b.matches("[0-9]{1,8}(\\.[0-9]{1,8}){0,3}"))throw new IllegalArgumentException("Invalid version");
    String[] left=a.split("\\."),right=b.split("\\.");
    for(int i=0;i<Math.max(left.length,right.length);i++){int x=i<left.length?Integer.parseInt(left[i]):0,y=i<right.length?Integer.parseInt(right[i]):0;if(x!=y)return Integer.compare(x,y);}return 0;
  }
  public static boolean newer(String version,String build,String installed,String installedBuild){int v=compare(version,installed),b=compare(build,installedBuild);return v>0||(v==0&&b>0);}
  public static boolean snoozed(String key,String saved,long at,long now){return key.equals(saved)&&at>0&&at<=now&&now-at<86400000L;}
}
