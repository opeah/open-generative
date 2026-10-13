// In-memory registry of the providers the app knows about. Registration
// happens once, in providers/index.js (the composition root).

const providers = new Map();

export function registerProvider(provider) {
  if (providers.has(provider.id)) throw new Error(`Provider "${provider.id}" is already registered.`);
  providers.set(provider.id, provider);
  return provider;
}

export function getProvider(id) {
  return providers.get(id) || null;
}

export function listProviders() {
  return [...providers.values()];
}
