// Composition root: the only place that knows the concrete providers.
// Adding a provider = write providers/<id>/{index,catalog,transport}.js,
// register it here and its transport in providers/server.js.
import { registerProvider } from "./registry.js";
import { muapiProvider } from "./muapi/index.js";
import { kieProvider } from "./kie/index.js";
import { higgsfieldProvider } from "./higgsfield/index.js";

registerProvider(muapiProvider);
registerProvider(kieProvider);
registerProvider(higgsfieldProvider);

export { getProvider, listProviders } from "./registry.js";
export {
  DEFAULT_PROVIDER_ID,
  getActiveProvider,
  getActiveProviderId,
  setActiveProviderId,
  readProviderCredential,
  writeProviderCredential,
  clearProviderCredential,
} from "./settings.js";
export { Capability, providerSupports, providerSupportsStudio } from "./domain/capabilities.js";
export { serializeCredential, isCredentialComplete } from "./domain/provider.js";
