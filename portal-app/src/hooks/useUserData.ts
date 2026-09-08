/**
 * The signed-in user, their users/{uid} document, and a logout.
 *
 * Now a thin read of AuthProvider's context (#368) rather than its own
 * onAuthStateChanged plus its own getDoc. The return shape is unchanged, so
 * all 21 call sites are untouched - but there is now one listener and one
 * document read for the whole app instead of one per component.
 *
 * Since the provider watches the document with onSnapshot, callers now also
 * see role and profile changes without a reload. This hook used to do a
 * one-time read and go stale.
 */

import { useAuth } from "@/context/AuthProvider";

const useUserData = () => {
  const { user, userData, loading, logout } = useAuth();
  return { user, userData, loading, logout };
};

export default useUserData;
