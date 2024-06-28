import React from "react";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const Navbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: "consumer",
        });
        console.log("User added to Firestore:", user.email);
      } else {
        console.log("User already exists in Firestore:", user.email);
      }
      const token = await user.getIdToken();
      const authInfo = {
        userID: user.uid,
        isAuth: true,
        jwt: token,
      };
      localStorage.setItem("auth", JSON.stringify(authInfo));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="text-white text-xl">DIYA Curriculum Portal</div>
      <div className="space-x-4 text-white">
        <a href="#about" className="hover:underline">
          About Us
        </a>
        <a href="#resources" className="hover:underline">
          Resources
        </a>
        <a href="#contact" className="hover:underline">
          Contact Us
        </a>
      </div>
      <div>
        {!user ? (
          <>
            <button
              onClick={handleGoogleAuth}
              className="bg-white text-gray-800 px-4 py-2 rounded mr-2"
            >
              Sign in
            </button>
            <button
              onClick={handleGoogleAuth}
              className="bg-white text-gray-800 px-4 py-2 rounded"
            >
              Sign up
            </button>
          </>
        ) : (
          <button
            onClick={handleSignOut}
            className="bg-white text-gray-800 px-4 py-2 rounded"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
