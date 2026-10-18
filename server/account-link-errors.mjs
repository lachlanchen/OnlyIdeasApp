/** Safe, app-owned connection failures. Never include target account details. */
export const linkFailures = Object.freeze({
  account_already_linked: {status:409,action:'choose_account',message:"This login belongs to another app account. Linking was refused. Your current data and plan are unchanged. Choose another login or cancel."},
  different_account_already_linked: {status:409,action:'reconnect_original',message:"This login belongs to another app account. Linking was refused. Your current data and plan are unchanged. Choose another login or cancel."},
  local_reauthentication_required: {status:403,action:'reauthenticate',message:"Sign in again with the same app account, then retry connecting. Your data and plan are unchanged."},
  local_session_changed: {status:403,action:'return_to_account',message:"Return to the app account you want to keep, then connect again. No accounts were combined."},
  central_reauthentication_required: {status:403,action:'retry',message:"Confirm your LazyingArt sign-in again, then retry. Your app account is unchanged."},
  authorization_cancelled: {status:400,action:'cancel',message:"Connection cancelled. Your app account is unchanged."},
});
export function linkFailure(code) {return linkFailures[code] || {status:503,action:'retry',message:'Account connection did not finish. Return to the app and try again.'};}
