// Every supported provider runs generations as asynchronous jobs: submit,
// get an id, poll until a terminal state. Adapters translate their own
// status payloads into a JobSnapshot; the polling loop is shared.

export const JobState = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
});

/**
 * @typedef {Object} JobSnapshot
 * @property {string} state       A JobState value.
 * @property {string[]} [outputs] Output URLs once the job succeeded.
 * @property {string} [error]     Failure reason once the job failed.
 * @property {*} [raw]            Provider payload, kept for debugging.
 */

export class GenerationError extends Error {
  constructor(message, { requestId, raw } = {}) {
    super(message);
    this.name = "GenerationError";
    this.requestId = requestId;
    // Same property name as the MuAPI lifecycle so error toasts keep working.
    this.generationResult = raw;
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Polls readSnapshot() until the job succeeds or fails.
 * Errors flagged `retryable: false` (bad key, unknown task) stop the loop;
 * anything else is treated as transient, because the job is already paid for.
 */
export async function waitForJob(readSnapshot, { requestId, interval = 2000, maxAttempts = 900 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await wait(interval);

    let snapshot;
    try {
      snapshot = await readSnapshot();
    } catch (error) {
      if (error?.retryable === false || attempt === maxAttempts) throw error;
      continue;
    }

    if (snapshot.state === JobState.SUCCEEDED) {
      if (!snapshot.outputs?.length) {
        throw new GenerationError("Generation finished without any output.", { requestId, raw: snapshot.raw });
      }
      return snapshot;
    }
    if (snapshot.state === JobState.FAILED) {
      throw new GenerationError(`Generation failed: ${snapshot.error || "Unknown error"}`, {
        requestId,
        raw: snapshot.raw,
      });
    }
  }

  throw new GenerationError(`Generation timed out after polling. Request ID: ${requestId}`, { requestId });
}

/** Shapes a finished job the way studios expect a generation result. */
export function toGenerationResult(snapshot, requestId) {
  return {
    url: snapshot.outputs[0],
    outputs: snapshot.outputs,
    request_id: requestId,
    id: requestId,
  };
}
