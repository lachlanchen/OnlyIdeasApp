import {readFileSync,statSync} from 'node:fs';
import {AppStoreServerAPIClient,Environment,SignedDataVerifier,VerificationStatus} from '@apple/app-store-server-library';
import {GoogleAuth,OAuth2Client} from 'google-auth-library';
import {requireValue,AppError,hash} from './domain.mjs';
import {plans,planForProduct} from './plans.mjs';

const bundle='art.onlyideas.app', appID=6816392935;
const privateFile=path=>{const stat=statSync(path);requireValue(stat.isFile()&&!(stat.mode&0o077),'Purchase credentials must be owner-only.');return readFileSync(path,'utf8');};
const timestamp=value=>{const n=typeof value==='number'?value:Date.parse(value);requireValue(Number.isSafeInteger(n)&&n>0,'The store returned an invalid purchase date.',502);return n;};
export function appleProof(transaction) {
  requireValue(transaction.bundleId===bundle && transaction.type==='Auto-Renewable Subscription' && transaction.inAppOwnershipType==='PURCHASED','This purchase is not an OnlyIdeas subscription.',400);
  requireValue(planForProduct('apple',transaction.productId),'Unknown OnlyIdeas plan.');
  requireValue(typeof transaction.appAccountToken==='string','The purchase is missing its OnlyIdeas account binding.',409);
  const expires=timestamp(transaction.expiresDate),revoked=!!transaction.revocationDate;
  return {platform:'apple',environment:transaction.environment,accountToken:transaction.appAccountToken.toLowerCase(),receipt:transaction.transactionId,
    subscription:transaction.originalTransactionId,product:transaction.productId,expires,observed:timestamp(transaction.signedDate),purchased:timestamp(transaction.purchaseDate),revoked,
    paid:!revoked&&Number.isSafeInteger(transaction.price)&&transaction.price>0,state:revoked?'revoked':expires>Date.now()?'active':'expired'};
}
export function googleProof(purchase,order,token) {
  requireValue(order.purchaseToken===token && typeof order.orderId==='string','The store returned a mismatched order.',502);
  const latest=purchase.lineItems?.find(l=>l.latestSuccessfulOrderId===order.orderId);
  const billedProduct=order.lineItems?.find(l=>planForProduct('google',l.productId)&&l.subscriptionDetails);
  const line=latest || (billedProduct ? {productId:billedProduct.productId,expiryTime:billedProduct.subscriptionDetails.servicePeriodEndTime}:null);
  requireValue(line && planForProduct('google',line.productId),'Unknown OnlyIdeas plan.');
  const billed=order.lineItems?.find(l=>l.productId===line.productId);
  requireValue(billed?.subscriptionDetails,'The store returned a non-subscription order.',502);
  requireValue(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId,'The purchase is missing its OnlyIdeas account binding.',409);
  const revoked=order.state==='REFUNDED'||order.state==='CANCELED';
  const states={SUBSCRIPTION_STATE_ACTIVE:'active',SUBSCRIPTION_STATE_IN_GRACE_PERIOD:'grace',SUBSCRIPTION_STATE_CANCELED:'active',SUBSCRIPTION_STATE_ON_HOLD:'paused',SUBSCRIPTION_STATE_PAUSED:'paused',SUBSCRIPTION_STATE_EXPIRED:'expired',SUBSCRIPTION_STATE_PENDING:'pending',SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED:'expired'};
  const expires=timestamp(line.expiryTime);
  requireValue(states[purchase.subscriptionState],'The store returned an unknown subscription state.',502);
  // A partial refund retains the credit grant; only a verified full refund
  // reverses it. Pending initial payments never grant credits.
  const paid=['PROCESSED','PARTIALLY_REFUNDED','PENDING_REFUND'].includes(order.state)&&!billed.subscriptionDetails.offerPhaseDetails?.freeTrialDetails&&billed.subscriptionDetails.offerPhase!=='FREE_TRIAL';
  return {platform:'google',environment:purchase.testPurchase?'Sandbox':'Production',accountToken:purchase.externalAccountIdentifiers.obfuscatedExternalAccountId,
    receipt:order.orderId,subscription:hash(token),product:line.productId,expires,observed:Date.now(),purchased:timestamp(order.createTime),revoked,paid,
    state:revoked?'revoked':!latest||expires<=Date.now()?'expired':states[purchase.subscriptionState]};
}

export function createPurchaseVerifiers(config,{googleAuth=null}={}) {
  const settings=config.billing||{};
  let apple=null,google=googleAuth;
  if(settings.apple?.keyFile&&settings.apple?.keyId&&settings.apple?.issuerId) {
    const key=privateFile(settings.apple.keyFile);
    const roots=['AppleIncRootCertificate.cer','AppleRootCA-G2.cer','AppleRootCA-G3.cer'].map(name=>readFileSync(new URL('./apple-roots/'+name,import.meta.url)));
    apple=new Map([Environment.PRODUCTION,...(settings.allowSandbox===true?[Environment.SANDBOX]:[])].map(environment=>[environment,{
      verifier:new SignedDataVerifier(roots,true,environment,bundle,appID),
      client:new AppStoreServerAPIClient(key,settings.apple.keyId,settings.apple.issuerId,bundle,environment),
    }]));
  }
  if(settings.google?.keyFile) google=new GoogleAuth({credentials:JSON.parse(privateFile(settings.google.keyFile)),scopes:['https://www.googleapis.com/auth/androidpublisher']});
  const googleRequest=async(path,method='GET',data)=>{
    requireValue(google,'Google Play purchase verification is not connected yet.',503);
    const client=await google.getClient();
    return (await client.request({url:'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+bundle+path,method,data,timeout:30_000})).data;
  };
  async function decodeApple(signed,notification=false) {
    requireValue(apple,'App Store purchase verification is not connected yet.',503);
    requireValue(typeof signed==='string'&&signed.length>20&&signed.length<=100_000,'Invalid signed purchase.');
    for(const [environment,service] of apple) {
      try {return {environment,service,decoded:await service.verifier[notification?'verifyAndDecodeNotification':'verifyAndDecodeTransaction'](signed)};}
      catch(error) {if(error.status!==VerificationStatus.INVALID_ENVIRONMENT)throw new AppError('The App Store signature could not be verified. Try restoring purchases.',400);}
    }
    throw new AppError('This purchase environment is not enabled.',403);
  }
  return {
    ready:{apple:!!apple,google:!!google},
    async apple(signed) {
      const initial=await decodeApple(signed),id=initial.decoded.transactionId;
      requireValue(typeof id==='string'&&/^\d{1,40}$/.test(id),'Invalid App Store transaction.');
      const latest=await initial.service.client.getTransactionInfo(id);
      const current=await initial.service.verifier.verifyAndDecodeTransaction(latest.signedTransactionInfo);
      requireValue(current.transactionId===id&&current.appAccountToken===initial.decoded.appAccountToken,'The App Store purchase changed accounts.',409);
      return appleProof(current);
    },
    async appleHistory(source) {
      const service=apple?.get(source.environment);requireValue(service,'Purchase environment unavailable.',503);
      const history=await service.client.getTransactionHistory(source.transaction,source.revision||null,{productIds:plans.map(p=>p.apple),sort:'ASCENDING'});
      const proofs=[];
      for(const signed of history.signedTransactions||[]) proofs.push(appleProof(await service.verifier.verifyAndDecodeTransaction(signed)));
      // Status refresh preserves access during verified billing grace periods.
      const status=await service.client.getAllSubscriptionStatuses(source.transaction);
      for(const group of status.data||[])for(const item of group.lastTransactions||[]) {
        const transaction=await service.verifier.verifyAndDecodeTransaction(item.signedTransactionInfo);
        if(!planForProduct('apple',transaction.productId))continue;
        const proof=appleProof(transaction);
        if(item.status===4&&item.signedRenewalInfo) {
          const renewal=await service.verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo);
          requireValue(renewal.originalTransactionId===transaction.originalTransactionId,'Subscription status mismatch.',502);
          if(renewal.gracePeriodExpiresDate>Date.now()&&!proof.revoked){proof.state='grace';proof.expires=timestamp(renewal.gracePeriodExpiresDate);proof.observed=Math.max(proof.observed,timestamp(renewal.signedDate));}
        }
        proofs.push(proof);
      }
      return {proofs,source:{...source,revision:history.revision},more:history.hasMore===true};
    },
    async appleNotification(signed) {
      const {decoded}=await decodeApple(signed,true);
      return decoded.data?.signedTransactionInfo ? this.apple(decoded.data.signedTransactionInfo):null;
    },
    async google(token,extraOrders=[],prior=null) {
      requireValue(typeof token==='string'&&token.length>=20&&token.length<=4000,'Invalid Google Play purchase token.');
      let purchase;
      try {purchase=await googleRequest('/purchases/subscriptionsv2/tokens/'+encodeURIComponent(token));}
      catch(error) {
        // Play retires expired subscription tokens. Known receipts still need
        // refund reconciliation via the Orders API, using their saved binding.
        if(!prior || ![404,410].includes(error.response?.status))throw error;
        requireValue(prior.accountToken&&['Production','Sandbox'].includes(prior.environment),'Missing saved purchase binding.',502);
        purchase={lineItems:[],externalAccountIdentifiers:{obfuscatedExternalAccountId:prior.accountToken},subscriptionState:'SUBSCRIPTION_STATE_EXPIRED',...(prior.environment==='Sandbox'?{testPurchase:{}}:{})};
      }
      requireValue(!purchase.testPurchase||settings.allowSandbox===true,'This purchase environment is not enabled.',403);
      const current=(purchase.lineItems||[]).map(l=>l.latestSuccessfulOrderId).filter(Boolean);
      // Order numbers are only lookup candidates. Every returned order must still
      // match the verified purchase token; an inferred suffix grants nothing.
      const history=current.flatMap(id=>{const m=id.match(/^(GPA\.[\d-]+)\.\.(\d+)$/);if(!m)return [];const last=Number(m[2]);return [m[1],...Array.from({length:Math.min(last,100)},(_,i)=>m[1]+'..'+(last-1-i))];});
      const orders=[...new Set([...current,...extraOrders.slice(0,100),...history])].slice(0,103);
      requireValue(orders.length>0&&orders.length<=103,'This purchase is still pending. Try restoring it after payment completes.',409);
      const query=new URLSearchParams();for(const id of orders)query.append('orderIds',id);
      const batch=await googleRequest('/orders:batchGet?'+query.toString());
      requireValue(Array.isArray(batch.orders)&&batch.orders.length===orders.length,'The store returned incomplete order history.',502);
      const returned=new Set(batch.orders.map(order=>order.orderId));
      requireValue(returned.size===orders.length&&orders.every(id=>returned.has(id)),'The store returned mismatched orders.',502);
      const proofs=batch.orders.map(order=>googleProof(purchase,order,token));
      return {proofs,source:{token,orders:[...new Set(orders)],accountToken:proofs[0].accountToken,environment:proofs[0].environment},acknowledge:async()=>{
        if(purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING'&&proofs.some(p=>p.paid&&!p.revoked)) {
          await googleRequest('/purchases/subscriptions/'+encodeURIComponent(proofs[0].product)+'/tokens/'+encodeURIComponent(token)+':acknowledge','POST',{});
        }
      }};
    },
    async googleNotification(req,body) {
      const {pushAudience,pushServiceAccount}=settings.google||{};
      requireValue(pushAudience&&pushServiceAccount,'Google Play notifications are not connected yet.',503);
      const token=String(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];requireValue(token,'Notification authorization required.',401);
      let payload;
      try {payload=(await new OAuth2Client().verifyIdToken({idToken:token,audience:pushAudience})).getPayload();}
      catch {throw new AppError('Invalid notification identity.',401);}
      requireValue(payload?.email_verified===true&&payload.email===pushServiceAccount,'Invalid notification identity.',401);
      const notification=JSON.parse(Buffer.from(String(body.message?.data||''),'base64').toString('utf8'));
      requireValue(notification.packageName===bundle,'Notification is for another app.',400);
      return notification.subscriptionNotification ? {token:notification.subscriptionNotification.purchaseToken,orders:[]} : notification.voidedPurchaseNotification ? {token:notification.voidedPurchaseNotification.purchaseToken,orders:[notification.voidedPurchaseNotification.orderId]}:null;
    },
  };
}
