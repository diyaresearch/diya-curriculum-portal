import { useState, useEffect } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import axios from "axios";

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS = SCHEMA_QUALIFIER + "users";

console.log("useUserData table users is", TABLE_USERS);

const useUserData = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [firstVisit, setFirstVisit] = useState(true); 

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted components
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

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
          setAuthError("");
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (!firstVisit) { // Only show error if it is NOT the first visit
            setAuthError("Failed to fetch user data. Please try again.");
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
      setFirstVisit(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);
  // This function is for signin
  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();

      // Authenticate user with the backend
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(user);
      setUserData(response.data);
      setAuthError("");
    } catch (error) {
      console.error("Error with Google Sign-In:", error);
      //  error handling
      if (error.response?.status === 404) {
        setAuthError("This Google account is not registered. Please sign up first.");
      } else {
        setAuthError("An error occurred during sign-in. Please try again.");
      }
    }
  };

  // reload after first time signup
  const refreshUserData = async () => {
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUser(auth.currentUser);
        setUserData(response.data);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
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

  return { user, userData, handleGoogleAuth, handleSignOut, refreshUserData, authError, setAuthError, loading };
};

export default useUserData;
