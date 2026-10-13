import * as muapi from "../../muapi.js";
import * as models from "../../models.js";
import { Capability } from "../domain/capabilities.js";
import { defineProvider } from "../domain/provider.js";

// MuAPI adapter. muapi.js and models.js stay exactly as upstream ships them
// (so the fork keeps merging cleanly); this file only exposes them through
// the provider port. MuAPI keeps its own proxy routes (middleware.js,
// app/api/v1, app/api/workflow…) rather than /api/providers.
export const muapiProvider = defineProvider({
  id: "muapi",
  name: "MuAPI",
  credential: {
    fields: [{ name: "key", label: "API key", secret: true }],
    helpUrl: "https://muapi.ai/access-keys",
  },
  capabilities: Object.values(Capability),
  catalog: models,
  generateImage: muapi.generateImage,
  generateI2I: muapi.generateI2I,
  generateVideo: muapi.generateVideo,
  generateI2V: muapi.generateI2V,
  processV2V: muapi.processV2V,
  processLipSync: muapi.processLipSync,
  generateAudio: muapi.generateAudio,
  uploadFile: muapi.uploadFile,
  getUserBalance: muapi.getUserBalance,
});
