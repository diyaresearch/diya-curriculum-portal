import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import Loading from "@/components/ui/Loading";
import { useAuth } from "@/context/AuthProvider";
import { ROLES } from "@/constants/roles";

export interface ProtectedRouteProps {
    children?: ReactNode;
    /** Require a signed-in user, whatever their role. */
    requireAuth?: boolean;
    /** Require one of these roles. Implies `requireAuth`. */
    allowedRoles?: readonly string[] | null;
    /** Where a rejected visitor lands. */
    redirectTo?: string;
    redirectTeacherPlus?: boolean;
}

/**
 * The one route guard (#444). It replaces the per-page
 * `useEffect(() => { if (!loading && !user) navigate("/") })` that eight pages
 * carried a copy of: each of those rendered its own signed-in-only UI for a
 * frame first, and each had its own idea of where to send you.
 *
 * Reads auth from the shared provider (#368) instead of running its own
 * onAuthStateChanged plus its own users/{uid} read. It is rendered around
 * routes, so on some screens it was the second or third component doing
 * exactly that work for exactly the same document.
 *
 *   <ProtectedRoute requireAuth>                        signed in
 *   <ProtectedRoute allowedRoles={[ROLES.TEACHER_PLUS]}> signed in, with that role
 *   <ProtectedRoute redirectTeacherPlus>                 send TeacherPlus to their dashboard
 */
const ProtectedRoute = ({
    children,
    requireAuth = false,
    allowedRoles = null,
    redirectTo = "/",
    redirectTeacherPlus = false,
}: ProtectedRouteProps) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Loading variant="page" />;
    }

    // Redirect TeacherPlus users to their dashboard
    if (redirectTeacherPlus && user && role === ROLES.TEACHER_PLUS) {
        return <Navigate to="/teacher-plus" replace />;
    }

    // `allowedRoles` implies authentication - there is no role without a user.
    if ((requireAuth || allowedRoles) && !user) {
        return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
    }

    // A signed-in user with no role recorded fails the check, which is what
    // `allowedRoles.includes(null)` did before this was typed.
    if (allowedRoles && !(role && allowedRoles.includes(role))) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

export default ProtectedRoute;
