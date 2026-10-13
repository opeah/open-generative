import { getActiveProvider } from "./providers/index.js";

// Catalog facade: same exports as models.js, taken from the active provider.
// Resolved once when the studios load; switching provider reloads the page
// (see providers/settings.js). With MuAPI active these are models.js's own
// exports, unchanged.
const catalog = getActiveProvider().catalog;

export const t2iModels = catalog.t2iModels;
export const getModelById = catalog.getModelById;
export const getSelectableAspectRatiosForModel = catalog.getSelectableAspectRatiosForModel;
export const getAspectRatiosForModel = catalog.getAspectRatiosForModel;
export const t2vModels = catalog.t2vModels;
export const getVideoModelById = catalog.getVideoModelById;
export const getAspectRatiosForVideoModel = catalog.getAspectRatiosForVideoModel;
export const getDurationsForModel = catalog.getDurationsForModel;
export const getResolutionsForVideoModel = catalog.getResolutionsForVideoModel;
export const i2iModels = catalog.i2iModels;
export const i2vModels = catalog.i2vModels;
export const getI2IModelById = catalog.getI2IModelById;
export const getI2VModelById = catalog.getI2VModelById;
export const getMaxImagesForI2VModel = catalog.getMaxImagesForI2VModel;
export const getSelectableAspectRatiosForI2IModel = catalog.getSelectableAspectRatiosForI2IModel;
export const getAspectRatiosForI2IModel = catalog.getAspectRatiosForI2IModel;
export const getAspectRatiosForI2VModel = catalog.getAspectRatiosForI2VModel;
export const getDurationsForI2VModel = catalog.getDurationsForI2VModel;
export const getResolutionsForI2VModel = catalog.getResolutionsForI2VModel;
export const getEffectsForI2VModel = catalog.getEffectsForI2VModel;
export const getDefaultEffectForI2VModel = catalog.getDefaultEffectForI2VModel;
export const getResolutionsForI2IModel = catalog.getResolutionsForI2IModel;
export const getEffectsForI2IModel = catalog.getEffectsForI2IModel;
export const getDefaultEffectForI2IModel = catalog.getDefaultEffectForI2IModel;
export const getQualityFieldForModel = catalog.getQualityFieldForModel;
export const getResolutionsForModel = catalog.getResolutionsForModel;
export const getQualityFieldForI2IModel = catalog.getQualityFieldForI2IModel;
export const getMaxImagesForI2IModel = catalog.getMaxImagesForI2IModel;
export const v2vModels = catalog.v2vModels;
export const lipsyncModels = catalog.lipsyncModels;
export const getLipSyncModelById = catalog.getLipSyncModelById;
export const getResolutionsForLipSyncModel = catalog.getResolutionsForLipSyncModel;
export const imageLipSyncModels = catalog.imageLipSyncModels;
export const videoLipSyncModels = catalog.videoLipSyncModels;
export const getV2VModelById = catalog.getV2VModelById;
export const recastModels = catalog.recastModels;
export const getRecastModelById = catalog.getRecastModelById;
export const getAspectRatiosForRecastModel = catalog.getAspectRatiosForRecastModel;
export const motionControlModels = catalog.motionControlModels;
export const getMotionControlModelById = catalog.getMotionControlModelById;
export const getAspectRatiosForMotionControlModel = catalog.getAspectRatiosForMotionControlModel;
export const audioModels = catalog.audioModels;
export const getAudioModelById = catalog.getAudioModelById;
