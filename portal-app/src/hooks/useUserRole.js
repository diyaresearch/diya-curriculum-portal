/**
 * The signed-in user and their role.
 *
 * Kept as a separate hook because 4 components want only these two values
 * and reading a narrower shape keeps their intent obvious. It no longer
 * carries its own onAuthStateChanged and onSnapshot - AuthProvider owns both
 * (#368), so this is a projection of the same state useUserData sees, and the
 * two can no longer disagree about who is signed in.
 *
 * Previously duplicated verbatim across ForTeachersSection, ForStudentsSection,
 * TestimonialsSection and ExploreModulesSection (#409).
 */

import { useAuth } from "@/context/AuthProvider";

function useUserRole() {
  const { user, role } = useAuth();
  return { user, role };
}

export default useUserRole;
