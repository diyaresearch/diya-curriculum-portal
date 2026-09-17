/**
 * Boot-time check that the browser and the backend are pointed at the same
 * Firebase project.
 *
 * They are configured from two unrelated places and nothing links them:
 *
 *   browser   portal-app/.env, .env.${mode}, .env.${mode}.local  -> VITE_FIREBASE_PROJECT_ID
 *   backend   functions/.env.${NODE_ENV}                         -> FIREBASE_PROJECT_ID
 *
 * So `portal-app/.env.development.local` pointing the browser at staging while
 * `functions/.env.development` still names production is a normal thing to end
 * up with, and nothing announces it. What you get instead is a 401 from
 * middleware/authenticateUser.js, because verifyIdToken rejects a token minted
 * by one project when the Admin SDK is configured for another - an error about
 * the token, for a problem that has nothing to do with the token. Sign-up
 * itself still appears to work, since it is a direct client-side setDoc that
 * never touches the backend, so the failure surfaces later and somewhere else.
 *
 * Dev-only, best-effort, and never blocks or throws: a backend that is simply
 * not running yet is the normal state during `npm start`, not a misconfiguration.
 * Use ./start.sh, which moves both halves together.
 */

import { apiUrl } from "@/utils/apiOrigin";

interface HealthResponse {
  status?: string;
  firestore?: string;
  /** The project the backend's Admin SDK is configured for. */
  projectId?: string;
  /** Whether the backend is talking to the Firestore emulator. */
  emulator?: boolean;
}

const BANNER = "Frontend/backend environment mismatch";

/** Human-readable name for what the browser is configured against. */
function describeFrontend(projectId: string | undefined, emulator: boolean): string {
  const name = projectId || "(unset)";
  return emulator ? `${name} via the local emulator` : name;
}

/**
 * Compare this bundle's Firebase project against the backend's and report any
 * disagreement. Resolves to true when they agree (or when the check could not
 * be made), so a caller may await it in a test without special-casing.
 */
export async function verifyBackendProject(): Promise<boolean> {
  const frontendProject = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const frontendEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

  let health: HealthResponse;
  try {
    // /api/health is unauthenticated on purpose, and answers 503 with the same
    // body shape when Firestore is unreachable - so read the body either way
    // rather than gating on response.ok. A credential outage is a different
    // problem from a project mismatch and should not mask this check.
    const response = await fetch(apiUrl("/api/health"));
    health = (await response.json()) as HealthResponse;
  } catch {
    // Backend not up yet, or not reachable. Not this function's problem.
    return true;
  }

  if (!health?.projectId) {
    // An older backend that predates this field. Nothing to compare.
    return true;
  }

  const projectsAgree = health.projectId === frontendProject;
  const emulatorsAgree = Boolean(health.emulator) === frontendEmulator;

  if (projectsAgree && emulatorsAgree) return true;

  const lines = [
    `${BANNER}.`,
    `  this app -> ${describeFrontend(frontendProject, frontendEmulator)}`,
    `  backend  -> ${describeFrontend(health.projectId, Boolean(health.emulator))}`,
    "",
    "Authenticated API calls will fail with 401 'Invalid or expired token':",
    "an ID token minted by one project cannot be verified against another.",
    "",
    "Start both halves together from the repo root:",
    "  ./start.sh              production",
    "  ./start.sh --staging    curriculum-portal-staging",
    "  ./start.sh --emulator   local emulator suite",
  ];

  if (!projectsAgree && frontendEmulator && health.emulator) {
    lines.push(
      "",
      "Both are on the emulator but under different project IDs, so each is",
      "writing to its own namespace inside it and neither can see the other's data."
    );
  }

  console.error(lines.join("\n"));
  return false;
}
