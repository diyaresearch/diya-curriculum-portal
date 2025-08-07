import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

const ProtectedRoute = ({ children, redirectTeacherPlus = false }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        const db = getFirestore(firebaseApp);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                try {
                    const teacherDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
                    if (teacherDoc.exists()) {
                        setUserRole(teacherDoc.data().role);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Redirect TeacherPlus users to their dashboard
    if (redirectTeacherPlus && user && userRole === "teacherPlus") {
        return <Navigate to="/teacher-plus" replace />;
    }

    return children;
};

export default ProtectedRoute;