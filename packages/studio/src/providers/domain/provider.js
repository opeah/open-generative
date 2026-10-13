import { OPERATION_CAPABILITIES } from "./capabilities.js";

/**
 * The port every generation provider implements. Studios never talk to a
 * provider API directly: they call the facade (generation.js / catalog.js),
 * which forwards to the active provider.
 *
 * @typedef {Object} GenerationResult
 * @property {string} url             First output URL (what studios display).
 * @property {string[]} [outputs]     Every output URL when there are several.
 * @property {string} [request_id]    Provider-side task id.
 * @property {string} [id]
 *
 * @typedef {Object} CredentialField
 * @property {string} name
 * @property {string} label
 * @property {boolean} [secret]
 *
 * @typedef {Object} CredentialSpec
 * @property {CredentialField[]} fields  Several fields are stored joined by ":".
 * @property {string} [helpUrl]          Where the user gets a key.
 *
 * @typedef {Object} GenerationProvider
 * @property {string} id
 * @property {string} name
 * @property {CredentialSpec} credential
 * @property {Set<string>} capabilities   Values of Capability.
 * @property {Object} catalog             Same shape as models.js exports (see createCatalog).
 * @property {string} [balanceLabel]      Shown next to the balance (e.g. "credits").
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [generateImage]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [generateI2I]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [generateVideo]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [generateI2V]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [processV2V]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [processLipSync]
 * @property {(apiKey: string, params: Object) => Promise<GenerationResult>} [generateAudio]
 * @property {(apiKey: string, file: File, onProgress?: (pct: number) => void) => Promise<string>} [uploadFile]
 * @property {(apiKey: string) => Promise<{ balance: number }>} [getUserBalance]
 */

const DEFAULT_CREDENTIAL = Object.freeze({
  fields: Object.freeze([{ name: "key", label: "API key", secret: true }]),
});

/** Validates a provider definition and freezes it. */
export function defineProvider(definition) {
  const { id, name, catalog } = definition;
  if (!id || !name) throw new Error("A provider needs an id and a name.");
  if (!catalog) throw new Error(`Provider "${id}" has no catalog.`);

  const capabilities = new Set(definition.capabilities || []);
  for (const [operation, capability] of Object.entries(OPERATION_CAPABILITIES)) {
    if (capabilities.has(capability) && typeof definition[operation] !== "function") {
      throw new Error(`Provider "${id}" declares "${capability}" but does not implement ${operation}().`);
    }
  }

  return Object.freeze({
    ...definition,
    credential: definition.credential || DEFAULT_CREDENTIAL,
    capabilities,
  });
}

export function serializeCredential(spec, values) {
  return spec.fields.map((field) => String(values[field.name] || "").trim()).join(":");
}

export function isCredentialComplete(spec, values) {
  return spec.fields.every((field) => String(values[field.name] || "").trim());
}
