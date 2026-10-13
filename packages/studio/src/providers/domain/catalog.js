import { getMediaCapability } from "../../modelCapabilities.js";
import { getAspectRatioOptions, I2I_DIMENSION_RATIOS, T2I_DIMENSION_RATIOS } from "../../imageSizing.js";

// A provider catalog exposes the exact same names as models.js (model lists
// plus lookup helpers), so studios can read any provider's models through the
// catalog.js facade without knowing which provider is active.
//
// Model entries use the studio schema the UI already renders:
//   { id, name, endpoint, provider, provider_name, inputs: { aspect_ratio: { enum, default }, … },
//     imageField, lastImageField, maxImages, videoField, audioField, … }
// `endpoint` is the provider-side model id; the rest is read by the studios.
//
// The helpers below mirror models.js semantics for an arbitrary set of lists.
// `aliases` maps model ids hardcoded in studios (e.g. DrawModal's
// "nano-banana-pro-edit") to this provider's equivalent model.

const EMPTY = Object.freeze([]);

function getDependentEnumValues(input, selections = {}) {
  const values = input?.enum || [];
  const dependencies = input?.enum_dependencies;
  if (!dependencies) return values;

  return Object.entries(dependencies).reduce((available, [field, rules]) => {
    const allowedValues = rules?.[String(selections[field])];
    if (!allowedValues) return available;
    const allowed = new Set(allowedValues);
    return available.filter((value) => allowed.has(value));
  }, values);
}

function getInputOptions(input) {
  if (!input) return [];
  if (input.enum) return input.enum;
  if (input.minValue !== undefined && input.maxValue !== undefined) {
    const step = input.step ?? 1;
    const precision = Math.max(
      String(input.minValue).split(".")[1]?.length || 0,
      String(step).split(".")[1]?.length || 0,
    );
    const count = Math.floor((input.maxValue - input.minValue) / step + 1e-9);
    return Array.from(
      { length: count + 1 },
      (_, index) => Number((input.minValue + index * step).toFixed(precision)),
    );
  }
  return input.default !== undefined ? [input.default] : [];
}

function qualityField(model) {
  if (!model) return null;
  if (model.inputs?.resolution) return "resolution";
  if (model.inputs?.quality) return "quality";
  return null;
}

function qualityOptions(model) {
  if (!model) return [];
  return model.inputs?.resolution?.enum || model.inputs?.quality?.enum || [];
}

export function createCatalog({
  t2iModels = EMPTY,
  i2iModels = EMPTY,
  t2vModels = EMPTY,
  i2vModels = EMPTY,
  v2vModels = EMPTY,
  lipsyncModels = EMPTY,
  audioModels = EMPTY,
  recastModels = EMPTY,
  motionControlModels = EMPTY,
  aliases = {},
} = {}) {
  const byId = (list) => (id) => {
    const resolvedId = aliases[id] || id;
    return list.find((model) => model.id === resolvedId);
  };
  const getModelById = byId(t2iModels);
  const getI2IModelById = byId(i2iModels);
  const getVideoModelById = byId(t2vModels);
  const getI2VModelById = byId(i2vModels);
  const getLipSyncModelById = byId(lipsyncModels);
  const getRecastModelById = byId(recastModels);
  const getMotionControlModelById = (id) => byId(motionControlModels)(id) || motionControlModels[0];

  return {
    t2iModels,
    i2iModels,
    t2vModels,
    i2vModels,
    v2vModels,
    lipsyncModels,
    audioModels,
    recastModels,
    motionControlModels,
    imageLipSyncModels: lipsyncModels.filter((model) => model.category === "image"),
    videoLipSyncModels: lipsyncModels.filter((model) => model.category === "video"),

    getModelById,
    getI2IModelById,
    getVideoModelById,
    getI2VModelById,
    getV2VModelById: byId(v2vModels),
    getLipSyncModelById,
    getRecastModelById,
    getMotionControlModelById,
    getAudioModelById: byId(audioModels),

    getSelectableAspectRatiosForModel: (id) => getAspectRatioOptions(getModelById(id), T2I_DIMENSION_RATIOS),
    getAspectRatiosForModel: (id) => {
      const model = getModelById(id);
      if (!model) return ["1:1"];
      return model.inputs?.aspect_ratio?.enum || ["1:1", "16:9", "9:16", "4:3", "3:2", "21:9"];
    },
    getQualityFieldForModel: (id) => qualityField(getModelById(id)),
    getResolutionsForModel: (id) => qualityOptions(getModelById(id)),

    getSelectableAspectRatiosForI2IModel: (id) => getAspectRatioOptions(getI2IModelById(id), I2I_DIMENSION_RATIOS),
    getAspectRatiosForI2IModel: (id) => {
      const model = getI2IModelById(id);
      if (!model) return ["1:1"];
      return model.inputs?.aspect_ratio?.enum || ["1:1", "16:9", "9:16"];
    },
    getQualityFieldForI2IModel: (id) => qualityField(getI2IModelById(id)),
    getResolutionsForI2IModel: (id) => qualityOptions(getI2IModelById(id)),
    getMaxImagesForI2IModel: (id) => {
      const model = getI2IModelById(id);
      return model ? getMediaCapability(model, "image").maxItems : 1;
    },
    getEffectsForI2IModel: (id) => getI2IModelById(id)?.inputs?.name?.enum || [],
    getDefaultEffectForI2IModel: (id) => getI2IModelById(id)?.inputs?.name?.default || null,

    getAspectRatiosForVideoModel: (id) => {
      const model = getVideoModelById(id);
      if (!model) return ["16:9"];
      return model.inputs?.aspect_ratio?.enum || ["16:9", "9:16", "1:1"];
    },
    getDurationsForModel: (id) => {
      const model = getVideoModelById(id);
      return model ? getInputOptions(model.inputs?.duration) : [5];
    },
    getResolutionsForVideoModel: (id, selections = {}) => {
      const input = getVideoModelById(id)?.inputs?.resolution;
      return input?.enum ? getDependentEnumValues(input, selections) : [];
    },

    getAspectRatiosForI2VModel: (id) => {
      const model = getI2VModelById(id);
      if (!model) return ["16:9"];
      if (model.aspectRatioMode === "inherited") return [];
      return model.inputs?.aspect_ratio?.enum || ["16:9", "9:16", "1:1"];
    },
    getDurationsForI2VModel: (id) => {
      const model = getI2VModelById(id);
      return model ? getInputOptions(model.inputs?.duration) : [];
    },
    getResolutionsForI2VModel: (id, selections = {}) => {
      const input = getI2VModelById(id)?.inputs?.resolution;
      return input?.enum ? getDependentEnumValues(input, selections) : [];
    },
    getMaxImagesForI2VModel: (id) => {
      const model = getI2VModelById(id);
      return model ? getMediaCapability(model, "image").maxItems : 1;
    },
    getEffectsForI2VModel: (id) => getI2VModelById(id)?.inputs?.name?.enum || [],
    getDefaultEffectForI2VModel: (id) => getI2VModelById(id)?.inputs?.name?.default || null,

    getResolutionsForLipSyncModel: (id) => getLipSyncModelById(id)?.inputs?.resolution?.enum || [],
    getAspectRatiosForRecastModel: (id) => getRecastModelById(id)?.inputs?.aspect_ratio?.enum || [],
    getAspectRatiosForMotionControlModel: (id) =>
      getMotionControlModelById(id)?.aspectRatios || ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
  };
}
