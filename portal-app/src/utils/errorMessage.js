/**
 * Turn any thrown thing into a sentence worth showing a user (#367).
 *
 * Before this, a failure reached the user in one of three ways depending on
 * which file it happened in: an alert() with hand-written text, a
 * console.error they never saw, or nothing at all. And where a message did
 * get shown it was often the raw error - "Failed to fetch", "Unexpected token
 * < in JSON at position 0" - which tells a teacher nothing about what to do.
 *
 * The mapping is deliberately keyed on ApiError's `code`/`status` rather than
 * on message text, so it cannot drift when a server message is reworded.
 */

import { ApiError } from "@/utils/apiClient";

const DEFAULT = "Something went wrong. Please try again.";

const BY_CODE = {
  NETWORK_ERROR: "Could not reach the server. Check your connection and try again.",
  ABORTED: null, // a cancelled request is not a failure the user should see
};

const BY_STATUS = {
  400: "That request wasn't valid. Please check the form and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with something that already exists.",
  413: "That file is too large to upload.",
  429: "Too many requests. Please wait a moment and try again.",
};

/**
 * @param {unknown} error    whatever landed in the catch
 * @param {string} fallback  what to say when nothing better is known
 * @returns {string|null}    null means "say nothing" (a cancelled request)
 */
export function toUserMessage(error, fallback = DEFAULT) {
  if (error instanceof ApiError) {
    if (error.code in BY_CODE) return BY_CODE[error.code];

    // 5xx messages are for engineers, not users - the server's own text is
    // usually a stack-adjacent detail, so prefer our own wording.
    if (error.status >= 500) return "The server had a problem. Please try again in a moment.";

    if (error.status in BY_STATUS) return BY_STATUS[error.status];

    // A 4xx the server explained itself: it wrote that message for a human,
    // so it beats anything generic we could substitute.
    if (error.message && error.status >= 400) return error.message;
  }

  return fallback;
}
