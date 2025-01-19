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
import logo from "../assets/DIYA_Logo.png";

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS =  SCHEMA_QUALIFIER + "users"; 

console.log('table users is', TABLE_USERS)

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // Fetch user data from Firestore
        const fetchUserData = async () => {
          const userRef = doc(db, TABLE_USERS, user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            console.error("User does not exist in Firestore");
          }
        };
        fetchUserData();
      } else {
        setUser(null);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); 
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, TABLE_USERS, user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          fullName: user.displayName,
          role: "consumer",
        });
        console.log("User added to Firestore:", user.email);
      } else {
        if (!userSnap.data().fullName) {
          await setDoc(userRef, {
            ...userSnap.data(),
            fullName: user.displayName,
          });
          console.log("User full name updated in Firestore:", user.displayName);
        } else {
          console.log("User already exists in Firestore:", user.email);
        }
      }

      const updatedUserSnap = await getDoc(userRef);
      setUserData(updatedUserSnap.data());
      console.log("User data updated in state:", updatedUserSnap.data());

      const token = await user.getIdToken();
      const authInfo = {
        userID: user.uid,
        isAuth: true,
        jwt: token,
      };
      localStorage.setItem("auth", JSON.stringify(authInfo));
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        alert(
          "You closed the popup window. Please try signing in or signing up again and do not close the window."
        );
      } else {
        console.error(err);
      }
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
    <nav style={{ width: "100%" }} 
    className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <img
          src={logo}
          alt="Logo"
          style={{ height: "113px", width: "90px" }}
        />
      </div>

      <div className="space-x-4 text-white">
        <a
          href="https://diya-research.org/team/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{
            fontSize: "18px",
            fontWeight: "400",
            fontFamily: "Open Sans, sans-serif",
            letterSpacing: "1.5px",
            textUnderlineOffset: "20px", 
            padding: "0px 20px",
          }}
        >
          Team
        </a>
        <div className="relative group inline-block">
          <a
            href="#"
            className="hover:underline group-hover:underline"
            style={{
              fontSize: "18px",
              fontWeight: "400",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1.5px",
              textUnderlineOffset: "20px",
              padding: "0px 20px",
            }}
          >
            For Educators
          </a>
          {/* Dropdown menu */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 mt-0 hidden group-hover:block hover:block"
            style={{
              padding: "20px 0px",
              margin: "auto",
              zIndex: 20,
              overflow: "hidden",
              minWidth: "180px"
            }}
          >
            <a
              href="https://diya-research.org/2025-teacher-nomination-form/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Nominations
            </a>
            <a
              href="https://diya-research.org/professional-development-workshop/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              PD Workshop
            </a>
            <a
              href="https://diya-research.org/ai-ambassador-program/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Ambassador
            </a>
          </div>
        </div>
        <div className="relative group inline-block">
          <a
            href="#"
            className="hover:underline group-hover:underline"
            style={{
              fontSize: "18px",
              fontWeight: "400",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1.5px",
              textUnderlineOffset: "20px",
              padding: "0px 20px",
            }}
          >
            For Students
          </a>
          <div
            className="absolute left-1/2 transform -translate-x-1/2 mt-0 hidden group-hover:block hover:block"
            style={{
              padding: "20px 0px",
              margin: "auto",
              zIndex: 20,
              overflow: "hidden",
              minWidth: "180px"
            }}
          >
            <a
              href="https://diya-research.org/ai-exploration/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Exploration
            </a>
            <a
              href="https://diya-research.org/python-for-ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Python for AI
            </a>
            <a
              href="https://diya-research.org/ai-insights/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Insights
            </a>
            <a
              href="https://diya-research.org/ai-forge/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Forge
            </a>
            <a
              href="https://diya-research.org/ai-research/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Research
            </a>
            <a
              href="https://diya-research.org/student-showcases/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Showcases
            </a>
            <a
              href="https://diya-research.org/diya-club-for-high-school/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              DIYA Club
            </a>
          </div>
        </div>
        <a
          href="https://diya-research.org/contact-us/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{
            fontSize: "18px",
            fontWeight: "400",
            fontFamily: "Open Sans, sans-serif",
            letterSpacing: "1.5px",
            textUnderlineOffset: "20px", 
            padding: "0px 20px",
          }}
        >
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
          <>
            <span className="text-white mr-4">
              Welcome {userData?.fullName}, logged in as{" "}
              {userData?.role}.
            </span>
            <button
              onClick={handleSignOut}
              className="bg-white text-gray-800 px-4 py-2 rounded"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
