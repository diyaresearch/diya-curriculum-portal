/// <reference types="vite/client" />

/**
 * The VITE_* variables this app reads, typed (#365).
 *
 * Without this, `import.meta.env.ANYTHING` is `any` and a typo in a variable
 * name is silently `undefined` at runtime - which is exactly how a missing
 * Firebase key used to surface as `auth/invalid-api-key` on the sign-in
 * button rather than as an error naming the variable.
 *
 * Every entry is optional on purpose: Vite only inlines what is present in
 * the .env file for the current mode, so a reader must handle absence.
 * firebaseConfig.ts is where the required ones are checked at load.
 *
 * Keep in sync with portal-app/.env.example and CLAUDE.md's "Environment
 * Variables Reference".
 */
interface ImportMetaEnv {
  /** Backend API origin. Blank/absent means same-origin via the Hosting rewrite. */
  readonly VITE_SERVER_ORIGIN_URL?: string;
  /** Frontend application URL. */
  readonly VITE_HOME_PAGE?: string;
  /** DIYA research organisation URL, linked from the navbar and footer. */
  readonly VITE_DIYA_BASE_URL?: string;

  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Analytics only, and absent in the staging project - never required. */
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;

  /** "true" points auth + Firestore at the local emulator suite (#428). */
  readonly VITE_USE_FIREBASE_EMULATOR?: string;

  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
