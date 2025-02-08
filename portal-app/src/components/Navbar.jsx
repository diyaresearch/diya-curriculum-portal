import React from "react";
import { useEffect, useState } from "react";
import useUserData from "../hooks/useUserData";
import logo from "../assets/DIYA_Logo.png";
import axios from "axios";
import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS =  SCHEMA_QUALIFIER + "users"; 

console.log('table users is', TABLE_USERS)

const Navbar = () => {
  const { user, userData, handleGoogleAuth, handleSignOut, refreshUserData, loading } = useUserData();
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    userType: "Teacher",
    jobTitle: "",
    subjects: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // Authenticate the user with Google
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
  
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();
  
      // Register user profile in the backend with the token
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/register`,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          institution: formData.institution,
          userType: formData.userType,
          jobTitle: formData.jobTitle,
          subjects: formData.subjects,
          email: user.email, 
          fullName: user.displayName,
        },
        {
          headers: { Authorization: `Bearer ${token}` }, 
        }
      );
  
      if (response.status === 201) {
        alert("Profile created successfully! You are now logged in.");
        setIsSignUpModalOpen(false);
        refreshUserData();
      } else {
        throw new Error("Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error.response?.data?.message || error.message);
      alert("Signup failed. Please check your information and try again.");
    }
  };

  return (
    <nav style={{ width: "100%" }} 
    className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <a href="https://diya-research.org" target="_blank" rel="noopener noreferrer"> 
          <img
          src={logo}
          alt="Logo"
          style={{ height: "113px", width: "90px" }}
          />
        </a> 
      </div>

      <div className="space-x-4 text-white">
        <a
          href="https://curriculum-portal-1ce8f.web.app/" // Added a link to DIYA Ed Portal 
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
          Home 
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
              onClick={() => setIsSignUpModalOpen(true)}
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
      {isSignUpModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign-Up</h2>
            <form onSubmit={handleSignUpSubmit}>
              <div className="flex mb-4 space-x-4">
                <div className="w-1/2">
                  <label className="block text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">I am a</label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="Teacher">Teacher</option>
                  {/* Add Student in the future */}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Institution</label>
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Job Role</label>
                <textarea
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="2"
                  placeholder="E.g., Principal, Supervisor, etc."
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Subjects</label>
                <select
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="Python">Python</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Earth Science">Earth Science</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Submit
              </button>
            </form>
            <button
              onClick={() => setIsSignUpModalOpen(false)}
              className="mt-4 w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
