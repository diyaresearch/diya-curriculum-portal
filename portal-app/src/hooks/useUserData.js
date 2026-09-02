import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useNavigate } from 'react-router-dom';
import { COLLECTIONS } from "../firebase/collectionNames";

const useUserData = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                setUser(firebaseUser);
                const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                    setLoading(false);
                    return;
                }
                setUserData(null);
                setLoading(false);
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });
        return () => {
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, []);

    const logout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            setUser(null);
            setUserData(null);
            navigate('/'); // Redirect to home page
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return {
        user,
        userData,
        loading,
        logout
    };
};

export default useUserData;