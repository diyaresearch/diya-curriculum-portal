import { useState, useEffect } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import axios from "axios";

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS = SCHEMA_QUALIFIER + "users";

console.log("useUserData table users is", TABLE_USERS);

const useUserData = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          console.log(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`)

          // Fetch user data from backend
          const response = await axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          setUser(user);
          setUserData(response.data);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();

      // Register user in backend
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/register`,
        { email: user.email, fullName: user.displayName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(user);
      setUserData(response.data);
    } catch (error) {
      console.error("Error with Google Sign-In:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return { user, userData, handleGoogleAuth, handleSignOut, loading };
};

export default useUserData;
