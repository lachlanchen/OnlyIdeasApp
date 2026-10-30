import art.onlyideas.app.AppUpdatePolicy;
public class AppUpdatePolicyCheck {
 public static void main(String[] args){
  check(AppUpdatePolicy.compare("1.10","1.9")==1);check(AppUpdatePolicy.compare("1.2","1.2.0")==0);
  check(AppUpdatePolicy.newer("1.1","1","1.0","99"));check(AppUpdatePolicy.newer("1.1","10","1.1","9"));
  check(!AppUpdatePolicy.newer("1.0.9","39","1.0.10","40"));check(!AppUpdatePolicy.newer("1.1","9","1.1","10"));check(!AppUpdatePolicy.newer("1.1","10","1.1","10"));
  for(String invalid:new String[]{"bad","1..2","1.2-beta","999999999999"}){try{AppUpdatePolicy.compare(invalid,"1");throw new AssertionError("accepted invalid version");}catch(IllegalArgumentException expected){}}
  check(AppUpdatePolicy.snoozed("x","x",1000,1001));check(!AppUpdatePolicy.snoozed("y","x",1000,1001));check(!AppUpdatePolicy.snoozed("x","x",1000,1001+86400000));check(!AppUpdatePolicy.snoozed("x","x",1002,1001));
  System.out.println("15 Android update policy checks passed");
 }
 static void check(boolean ok){if(!ok)throw new AssertionError("Update policy failed");}
}
