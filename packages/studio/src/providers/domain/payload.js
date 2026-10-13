import { mapReferenceParams } from "../../modelCapabilities.js";

// Studios send canonical params (prompt, aspect_ratio, duration, image_url,
// images_list, last_image, audio_url, …). This turns them into the input a
// model declares in its catalog entry, so adapters only have to wrap it in
// their own request envelope.
//
// Catalog entries can tune the mapping:
//   fixedInputs                 values always sent (e.g. { output_format: "png" })
//   promptField                 where the prompt goes ("prompt" by default, null to drop it)
//   defaultPrompt               sent when the user left the prompt empty but the API needs one
//   inputs[key].sendAs          provider parameter name when it differs from the studio's
//   inputs[key].serializeAs     "string" when the API wants "5" rather than 5
//   inputs[key].omitWithImages  drop the value when reference images are sent
//                               (e.g. the output follows the first frame's ratio)

const optionValue = (option) => (option && typeof option === "object" ? option.value : option);

function coerce(value, schema) {
  if (schema.enum && !schema.enum.some((option) => String(optionValue(option)) === String(value))) {
    if (schema.default === undefined) return undefined;
    value = schema.default;
  }
  if (schema.serializeAs === "string") return String(value);
  if (["int", "integer", "number", "float"].includes(schema.type) && typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (schema.type === "boolean") return value === true || value === "true";
  return value;
}

export function buildModelInput(model, params = {}) {
  const input = { ...(model.fixedInputs || {}) };
  const promptField = model.promptField === undefined ? "prompt" : model.promptField;

  const prompt = typeof params.prompt === "string" ? params.prompt.trim() : params.prompt;
  if (promptField && (prompt || model.defaultPrompt)) input[promptField] = prompt || model.defaultPrompt;

  const media = mapReferenceParams(model, params);
  const hasImages = Boolean(
    (model.imageField && media[model.imageField]) || (model.lastImageField && media[model.lastImageField]),
  );

  for (const [key, schema] of Object.entries(model.inputs || {})) {
    if (key === promptField || key in media || schema?.field) continue;
    if (schema?.omitWithImages && hasImages) continue;
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    const coerced = coerce(value, schema || {});
    if (coerced !== undefined) input[schema?.sendAs || key] = coerced;
  }

  return { ...input, ...media };
}
