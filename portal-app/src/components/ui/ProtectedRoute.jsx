import { Navigate } from 'react-router-dom';

import Loading from "@/components/ui/Loading";
import { useAuth } from "@/context/AuthProvider";

/**
 * Reads auth from the shared provider (#368) instead of running its own
 * onAuthStateChanged plus its own users/{uid} read. It is rendered around
 * routes, so on some screens it was the second or third component doing
 * exactly that work for exactly the same document.
 */
const ProtectedRoute = ({ children, redirectTeacherPlus = false }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return <Loading variant="page" />;
    }

    // Redirect TeacherPlus users to their dashboard
    if (redirectTeacherPlus && user && role === "teacherPlus") {
        return <Navigate to="/teacher-plus" replace />;
    }

    return children;
};

export default ProtectedRoute;
