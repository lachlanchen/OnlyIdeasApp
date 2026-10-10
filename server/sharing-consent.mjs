import {requireValue} from './domain.mjs';
export const sharingLicenses=['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission'];
export function sharingConsent(value,sharing) {
 if(sharing!=='shared'||!value?.attestation)return null;
 requireValue(value.attestation===true&&sharingLicenses.includes(value.license),'Choose a sharing license and confirm permission.');
 return {license:value.license,attestation:true,confirmedAt:new Date().toISOString()};
}
export function headerConsent(headers,sharing){return sharingConsent({license:headers['x-paper-license'],attestation:headers['x-paper-rights']==='confirmed'},sharing);}
