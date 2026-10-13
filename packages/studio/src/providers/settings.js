import { getProvider } from "./registry.js";

// Which provider is active, and each provider's stored credential. Both live
// in the browser (bring-your-own-key app). The active provider is read once
// when the studios load their catalog, so switching provider reloads the page.

export const DEFAULT_PROVIDER_ID = "muapi";
const ACTIVE_PROVIDER_KEY = "og_active_provider";
// MuAPI keeps its historical key so existing users stay signed in.
const LEGACY_CREDENTIAL_KEYS = { muapi: "muapi_key" };

const credentialKey = (providerId) => LEGACY_CREDENTIAL_KEYS[providerId] || `og_provider_credential:${providerId}`;

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage disabled (private mode, sandboxed iframe)
  }
}

export function getActiveProviderId() {
  const stored = storage()?.getItem(ACTIVE_PROVIDER_KEY);
  return stored && getProvider(stored) ? stored : DEFAULT_PROVIDER_ID;
}

export function setActiveProviderId(providerId) {
  if (!getProvider(providerId)) throw new Error(`Unknown provider "${providerId}".`);
  storage()?.setItem(ACTIVE_PROVIDER_KEY, providerId);
}

export function getActiveProvider() {
  return getProvider(getActiveProviderId());
}

export function readProviderCredential(providerId) {
  return storage()?.getItem(credentialKey(providerId)) || null;
}

export function writeProviderCredential(providerId, credential) {
  storage()?.setItem(credentialKey(providerId), credential);
}

export function clearProviderCredential(providerId) {
  storage()?.removeItem(credentialKey(providerId));
}
