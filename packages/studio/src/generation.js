import { getActiveProvider } from "./providers/index.js";
import { OPERATION_CAPABILITIES } from "./providers/domain/capabilities.js";

// Generation facade: same function names and signatures as muapi.js, routed
// to the active provider. Studios import from here instead of muapi.js.

function forward(operation) {
  return (...args) => {
    const provider = getActiveProvider();
    const implementation = provider[operation];
    if (typeof implementation !== "function") {
      return Promise.reject(new Error(`${provider.name} does not support ${OPERATION_CAPABILITIES[operation]}.`));
    }
    return implementation(...args);
  };
}

export const generateImage = forward("generateImage");
export const generateI2I = forward("generateI2I");
export const generateVideo = forward("generateVideo");
export const generateI2V = forward("generateI2V");
export const processV2V = forward("processV2V");
export const processLipSync = forward("processLipSync");
export const generateAudio = forward("generateAudio");
export const uploadFile = forward("uploadFile");
export const getUserBalance = forward("getUserBalance");
