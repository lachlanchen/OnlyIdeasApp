package art.onlyideas.app;

import android.app.Activity;
import com.android.billingclient.api.*;
import java.util.*;
import java.util.function.Consumer;

/** Store UI never mints credits; the server verifies and acknowledges every purchase. */
final class NativeBilling {
  interface Host {
    default boolean canPurchase(String accountToken) { return false; }
    void products(List<ProductDetails> products);
    void deliver(String token, Runnable complete);
    void notice(String text);
  }
  private final Activity activity;
  private final Host host;
  private final BillingClient client;
  private final Set<String> processing=new HashSet<>();
  private List<String> productIDs=List.of();
  private boolean connecting=false,closed=false;
  boolean trialEligible=false;
  NativeBilling(Activity activity,Host host) {
    this.activity=activity;this.host=host;
    client=BillingClient.newBuilder(activity)
      .setListener((result,purchases)->activity.runOnUiThread(()->{
        if(closed)return;
        if(result.getResponseCode()==BillingClient.BillingResponseCode.OK && purchases!=null)process(purchases);
        else if(result.getResponseCode()!=BillingClient.BillingResponseCode.USER_CANCELED)host.notice("The store is unavailable. Please try again.");
      }))
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .enableAutoServiceReconnection().build();
  }
  void load(List<String> ids) {
    productIDs=List.copyOf(ids);
    if(client.isReady()){queryProducts();restore();return;}
    if(connecting||closed)return;connecting=true;
    client.startConnection(new BillingClientStateListener(){
      public void onBillingServiceDisconnected(){}
      public void onBillingSetupFinished(BillingResult result){activity.runOnUiThread(()->{
        connecting=false;if(closed)return;
        if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){queryProducts();restore();}
        else host.notice("The store is unavailable. Please try again.");
      });}
    });
  }
  private void queryProducts() {
    List<QueryProductDetailsParams.Product> list=new ArrayList<>();
    for(String id:productIDs)list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
    if(list.isEmpty())return;
    client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(result,details)->activity.runOnUiThread(()->{
      if(closed)return;
      if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)host.products(details.getProductDetailsList());
      else host.notice("Plans are currently unavailable in this store.");
    }));
  }
  static ProductDetails.SubscriptionOfferDetails monthly(ProductDetails product,boolean trialEligible) {
    if(product.getSubscriptionOfferDetails()==null)return null;
    if(trialEligible)for(ProductDetails.SubscriptionOfferDetails offer:product.getSubscriptionOfferDetails()){
      List<ProductDetails.PricingPhase> p=offer.getPricingPhases().getPricingPhaseList();
      if("seven-day-trial".equals(offer.getOfferId())&&p.size()==2&&p.get(0).getPriceAmountMicros()==0&&Arrays.asList("P1W","P7D").contains(p.get(0).getBillingPeriod())&&p.get(0).getBillingCycleCount()==1&&p.get(1).getBillingPeriod().equals("P1M")&&p.get(1).getRecurrenceMode()==ProductDetails.RecurrenceMode.INFINITE_RECURRING)return offer;
    }
    for(ProductDetails.SubscriptionOfferDetails offer:product.getSubscriptionOfferDetails()) {
      List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();
      if(offer.getOfferId()==null&&phases.size()==1&&phases.get(0).getBillingPeriod().equals("P1M")&&phases.get(0).getRecurrenceMode()==ProductDetails.RecurrenceMode.INFINITE_RECURRING)return offer;
    }
    return null;
  }
  void purchase(ProductDetails product,String accountToken) {
    // Empty Play history is not permission. Recheck the app/server capability
    // at the controller boundary, even if a stale enabled button calls us.
    if(closed||accountToken==null||accountToken.isEmpty()||!host.canPurchase(accountToken))return;
    ProductDetails.SubscriptionOfferDetails offer=monthly(product,trialEligible);
    if(offer==null||!client.isReady()){host.notice("The store is unavailable. Please try again.");return;}
    BillingFlowParams flow=BillingFlowParams.newBuilder().setObfuscatedAccountId(accountToken)
      .setProductDetailsParamsList(List.of(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offer.getOfferToken()).build())).build();
    BillingResult result=client.launchBillingFlow(activity,flow);
    if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)host.notice("The store is unavailable. Please try again.");
  }
  void restore() {
    if(!client.isReady()||closed)return;
    client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(result,purchases)->activity.runOnUiThread(()->{
      if(closed)return;
      if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){process(purchases);if(purchases.isEmpty())host.notice("Your purchases are up to date.");}
      else host.notice("Please try restoring purchases.");
    }));
  }
  private void process(List<Purchase> purchases) {
    if(closed)return;
    for(Purchase purchase:purchases) {
      if(Collections.disjoint(productIDs,purchase.getProducts()))continue;
      if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING){host.notice("Payment is pending. Benefits will appear after the store confirms payment.");continue;}
      if(purchase.getPurchaseState()!=Purchase.PurchaseState.PURCHASED||!processing.add(purchase.getPurchaseToken()))continue;
      host.deliver(purchase.getPurchaseToken(),()->processing.remove(purchase.getPurchaseToken()));
    }
  }
  void close(){closed=true;client.endConnection();processing.clear();}
}
