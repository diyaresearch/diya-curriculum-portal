import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

const useUserRole = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Check in teachers collection first
                    const teacherDoc = await getDoc(doc(db, "teachers", currentUser.uid));
                    if (teacherDoc.exists()) {
                        const teacherData = teacherDoc.data();
                        setRole(teacherData.role || 'teacher');
                    } else {
                        // Check in users collection as fallback
                        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setRole(userData.role || 'user');
                        } else {
                            setRole('user'); // default role
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole('user'); // fallback role
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, role, loading };
};

export default useUserRole;