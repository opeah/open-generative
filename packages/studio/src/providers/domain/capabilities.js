// Canonical capabilities a generation provider can offer. A provider declares
// the ones it implements; studios and shell tabs declare the ones they need.
export const Capability = Object.freeze({
  TEXT_TO_IMAGE: "text-to-image",
  IMAGE_TO_IMAGE: "image-to-image",
  TEXT_TO_VIDEO: "text-to-video",
  IMAGE_TO_VIDEO: "image-to-video",
  VIDEO_TO_VIDEO: "video-to-video",
  LIPSYNC: "lipsync",
  AUDIO: "audio",
  UPLOAD: "upload",
  BALANCE: "balance",
  // Hosted platform features that only exist on MuAPI: workflows, agents,
  // apps, server-side history, clipping, motion graphics, marketing ads…
  PLATFORM: "platform",
});

// Port operation → capability it fulfils. The operation names match the
// historical muapi.js exports so studios keep calling the same functions.
export const OPERATION_CAPABILITIES = Object.freeze({
  generateImage: Capability.TEXT_TO_IMAGE,
  generateI2I: Capability.IMAGE_TO_IMAGE,
  generateVideo: Capability.TEXT_TO_VIDEO,
  generateI2V: Capability.IMAGE_TO_VIDEO,
  processV2V: Capability.VIDEO_TO_VIDEO,
  processLipSync: Capability.LIPSYNC,
  generateAudio: Capability.AUDIO,
  uploadFile: Capability.UPLOAD,
  getUserBalance: Capability.BALANCE,
});

// Shell tab id → capabilities that make the tab usable (any of them).
// Tabs missing from this map are MuAPI platform features.
const STUDIO_REQUIREMENTS = Object.freeze({
  image: [Capability.TEXT_TO_IMAGE, Capability.IMAGE_TO_IMAGE],
  video: [Capability.TEXT_TO_VIDEO, Capability.IMAGE_TO_VIDEO],
  lipsync: [Capability.LIPSYNC],
  audio: [Capability.AUDIO],
});

export function providerSupports(provider, capability) {
  return Boolean(provider?.capabilities?.has(capability));
}

export function providerSupportsStudio(provider, studioId) {
  if (providerSupports(provider, Capability.PLATFORM)) return true;
  const required = STUDIO_REQUIREMENTS[studioId];
  return Boolean(required?.some((capability) => providerSupports(provider, capability)));
}
