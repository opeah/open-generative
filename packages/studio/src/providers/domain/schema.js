// Small builders for catalog input schemas (the studio's `inputs` format), so
// provider catalogs read as data rather than repeated object literals.

export const choice = (name, title, values, defaultValue, extra = {}) => ({
  type: "string",
  title,
  name,
  enum: values,
  default: defaultValue,
  ...extra,
});

export const aspectRatio = (values, defaultValue, extra) =>
  choice("aspect_ratio", "Aspect Ratio", values, defaultValue, extra);

export const resolution = (values, defaultValue, extra) => choice("resolution", "Resolution", values, defaultValue, extra);

export const duration = (minValue, maxValue, defaultValue, extra = {}) => ({
  type: "int",
  title: "Duration",
  name: "duration",
  minValue,
  maxValue,
  step: 1,
  default: defaultValue,
  ...extra,
});

export const toggle = (name, title, defaultValue, description) => ({
  type: "boolean",
  title,
  name,
  default: defaultValue,
  description,
});

export const text = (name, title, description, extra = {}) => ({ type: "string", title, name, description, ...extra });

export const slider = (name, title, minValue, maxValue, defaultValue, step = 0.01) => ({
  type: "float",
  title,
  name,
  minValue,
  maxValue,
  step,
  default: defaultValue,
});

export const imageList = (name, maxItems) => ({ type: "array", title: "Reference Images", name, field: "image", maxItems });

// Brand metadata the model pickers use for logos and grouping.
export const BRANDS = {
  openai: { provider: "openai", provider_name: "OpenAI" },
  google: { provider: "google", provider_name: "Google" },
  bytedance: { provider: "bytedance", provider_name: "ByteDance" },
  bfl: { provider: "blackforest", provider_name: "Black Forest Labs" },
  kling: { provider: "kling", provider_name: "Kling" },
  alibaba: { provider: "alibaba", provider_name: "Alibaba" },
  minimax: { provider: "minimax", provider_name: "MiniMax" },
  xai: { provider: "grok", provider_name: "xAI" },
  ideogram: { provider: "ideogram", provider_name: "Ideogram" },
  higgsfield: { provider: "higgsfield", provider_name: "Higgsfield" },
};

// ── Variant pairs ──────────────────────────────────────────────────────────
// Studios group a model's text-to-X and image-to-X variants into one family
// and switch variant when the user adds reference images. The picker shows
// them as one entry when their inputs match, two otherwise.

const referenceInput = ({ field, max }) =>
  max === 1 ? { type: "string", title: "Reference Image", name: field, field: "image" } : imageList(field, max);

export function imageModelPair({ idPrefix, slug, name, brand, description, endpoints, inputs, i2iInputs = {}, references, fixedInputs }) {
  const common = { name, description, ...BRANDS[brand], ...(fixedInputs ? { fixedInputs } : {}) };
  return {
    t2i: endpoints.t2i && { ...common, id: `${idPrefix}-${slug}-text-to-image`, endpoint: endpoints.t2i, inputs },
    i2i: endpoints.i2i && {
      ...common,
      id: `${idPrefix}-${slug}-image-to-image`,
      endpoint: endpoints.i2i,
      imageField: references.field,
      maxImages: references.max,
      inputs: { ...inputs, ...i2iInputs, [references.field]: referenceInput(references) },
    },
  };
}

// `i2v` holds the image-to-video media mapping (imageField, lastImageField,
// maxImages, aspectRatioMode) plus any inputs that differ from text-to-video.
export function videoModelPair({ idPrefix, slug, name, brand, description, endpoint, endpoints = { t2v: endpoint, i2v: endpoint }, inputs, i2v }) {
  const common = { name, description, hasPrompt: true, ...BRANDS[brand] };
  const { inputs: i2vInputs = {}, ...i2vMedia } = i2v;
  return {
    t2v: endpoints.t2v && { ...common, id: `${idPrefix}-${slug}-text-to-video`, endpoint: endpoints.t2v, inputs },
    i2v: endpoints.i2v && {
      ...common,
      id: `${idPrefix}-${slug}-image-to-video`,
      endpoint: endpoints.i2v,
      ...i2vMedia,
      inputs: { ...inputs, ...i2vInputs },
    },
  };
}

/** Splits variant pairs into the lists createCatalog() expects. */
export function variantLists(pairs, modes) {
  return Object.fromEntries(modes.map(([mode, list]) => [list, pairs.map((pair) => pair[mode]).filter(Boolean)]));
}
