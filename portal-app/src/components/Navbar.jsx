import React, { useState, useEffect } from "react";
import useUserData from "../hooks/useUserData";
import logo from "../assets/DIYA_Logo.png";
import { getAuth } from "firebase/auth";
import { Link, useNavigate, useLocation } from "react-router-dom";
import defaultUserIcon from "../assets/default_user_icon.png";
import { startGoogleRedirect } from "../auth/googleAuth";

const Navbar = () => {
  const { userData, logout } = useUserData();
  const [user, setUser] = useState(null);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    userType: "Teacher",
    jobTitle: "",
    subjects: "",
  });
  const [errorMsg, setErrorMsg] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Show popup if query param is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("showSignUpPopup") === "1") {
      setErrorMsg(renderSignUpError());
    }
    // eslint-disable-next-line
  }, [location.search]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    try {
      await startGoogleRedirect({
        returnTo: `${location.pathname}${location.search || ""}`,
        promptSelectAccount: true,
        action: {
          type: "registerUser",
          payload: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            institution: formData.institution,
            userType: formData.userType,
            jobTitle: formData.jobTitle,
            subjects: formData.subjects,
          },
        },
      });
    } catch (error) {
      console.error("Signup error:", error?.message || error);
      alert("Signup failed. Please check your information and try again.");
    }
  };

  // Render the error popup content
  function renderSignUpError() {
    return (
      <div>
        No account exists for this Google account.
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="/student-signup" style={{ textDecoration: "none" }}>
            <button
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "12px 0",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer",
                marginBottom: 8
              }}
            >
              Sign Up as Student
            </button>
          </a>
          <a href="/teacher-signup" style={{ textDecoration: "none" }}>
            <button
              style={{
                width: "100%",
                background: "#162040",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "12px 0",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              Sign Up as Teacher
            </button>
          </a>
        </div>
      </div>
    );
  }

  // Remove the query param and close popup
  const closeErrorPopup = () => {
    setErrorMsg(null);
    const params = new URLSearchParams(location.search);
    params.delete("showSignUpPopup");
    navigate({ search: params.toString() }, { replace: true });
  };

  // Google login handler with Firestore check
  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      await startGoogleRedirect({
        returnTo: `${location.pathname}${location.search || ""}`,
      });
    } catch (error) {
      setErrorMsg(error?.message || "Login failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      alert("Logout failed. Please try again.");
    }
  };

  const role = userData?.role;
  const isTeacherDefault = role === "teacherDefault";
  const isTeacherPlus = role === "teacherPlus";
  const homeTo = isTeacherPlus ? "/teacherplus" : "/";

  return (
    <>
      <nav
        style={{ width: "100%", backgroundColor: "#fff", minHeight: "80px", height: "80px" }}
        className="px-4 flex justify-between items-center shadow"
      >
        <div className="flex items-center" style={{ gap: "20px" }}>
          <a href={process.env.REACT_APP_DIYA_BASE_URL} target="_blank" rel="noopener noreferrer">
            <img
              src={logo}
              alt="Logo"
              style={{
                height: "65px",
                width: "55px",
                borderRadius: "10%",
                objectFit: "contain",
                border: "1px solid #eee"
              }}
            />
          </a>
          <span
            style={{
              fontSize: "1.6rem",
              fontWeight: "600",
              color: "#000",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1px"
            }}
          >
            DIYA Ed Portal
          </span>
        </div>

        <div className="flex items-center space-x-0 ml-auto">
          <Link
            to={homeTo}
            className="hover:underline"
            style={{
              fontSize: "15px",
              fontWeight: "600",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1.5px",
              textUnderlineOffset: "20px",
              padding: "0px 20px",
              color: "#222",
              background: "none",
              border: "none",
              outline: "none",
              cursor: "pointer",
              height: "56px",
              display: "flex",
              alignItems: "center"
            }}
          >
            Home
          </Link>

          {/* Conditional nav links based on user role */}
          {isTeacherDefault && (
            <a
              href="/upgrade"
              className="hover:underline"
              style={{
                fontSize: "15px",
                fontWeight: "600",
                fontFamily: "Open Sans, sans-serif",
                letterSpacing: "1.5px",
                textUnderlineOffset: "20px",
                padding: "0px 20px",
                color: "#222",
                background: "none",
                border: "none",
                outline: "none",
                cursor: "pointer",
                height: "56px",
                display: "flex",
                alignItems: "center"
              }}
            >
              Upgrade
            </a>
          )}


          {isTeacherPlus && (
            <button
              onClick={() => navigate('/cancel-subscription')}
              className="hover:underline"
              style={{
                fontSize: "15px",
                fontWeight: "600",
                fontFamily: "Open Sans, sans-serif",
                letterSpacing: "1.5px",
                textUnderlineOffset: "20px",
                padding: "0px 20px",
                color: "#222",
                background: "none",
                border: "none",
                outline: "none",
                cursor: "pointer",
                height: "56px",
                display: "flex",
                alignItems: "center"
              }}
            >
              Cancel Subscription
            </button>
          )}

          {!isTeacherDefault && !isTeacherPlus && (
            <a
              href="/about"
              className="hover:underline"
              style={{
                fontSize: "15px",
                fontWeight: "600",
                fontFamily: "Open Sans, sans-serif",
                letterSpacing: "1.5px",
                textUnderlineOffset: "20px",
                padding: "0px 20px",
                color: "#222",
                background: "none",
                border: "none",
                outline: "none",
                cursor: "pointer",
                height: "56px",
                display: "flex",
                alignItems: "center"
              }}
            >
              About
            </a>
          )}

          {!user ? (
            <button
              onClick={handleGoogleLogin}
              className="hover:underline"
              style={{
                fontSize: "15px",
                fontWeight: "600",
                fontFamily: "Open Sans, sans-serif",
                letterSpacing: "1.5px",
                textUnderlineOffset: "20px",
                padding: "0px 20px",
                color: "#222",
                background: "none",
                border: "none",
                outline: "none",
                cursor: "pointer",
                height: "56px",
                display: "flex",
                alignItems: "center"
              }}
            >
              Log in
            </button>
          ) : (
            <>
              <div
                className="flex items-center space-x-2"
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  fontFamily: "Open Sans, sans-serif",
                  letterSpacing: "1.5px",
                  textUnderlineOffset: "20px",
                  padding: "0px 20px",
                  color: "#222",
                  background: "none",
                  border: "none",
                  outline: "none",
                  height: "56px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <img
                  src={defaultUserIcon}
                  alt="User Profile"
                  className="w-9 h-9 rounded-full border-2 border-black shadow-md mr-3"
                  style={{
                    objectFit: "cover",
                    background: "#e3e8f0",
                    padding: "2px"
                  }}
                />
                <span className="font-semibold">
                  {userData?.fullName || "Profile"}
                  {userData?.role && (
                    <span style={{ fontWeight: 400, fontSize: "0.95em" }}>
                      {" "}({userData.role})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="hover:underline"
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  fontFamily: "Open Sans, sans-serif",
                  letterSpacing: "1.5px",
                  textUnderlineOffset: "20px",
                  padding: "0px 20px",
                  color: "#222",
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  height: "56px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
        {isSignUpModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full relative">
              {/* X button in the top-right corner */}
              <button
                onClick={() => setIsSignUpModalOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-lg font-bold"
              >
                ✕
              </button>
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
            </div>
          </div>
        )}
      </nav>
      {/* Error Modal Popup */}
      {errorMsg && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "40px 32px",
              minWidth: 340,
              maxWidth: 400,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              textAlign: "center",
              position: "relative"
            }}
          >
            <button
              onClick={closeErrorPopup}
              style={{
                position: "absolute",
                top: 12,
                right: 18,
                background: "none",
                border: "none",
                fontSize: "1.7rem",
                color: "#888",
                cursor: "pointer"
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 style={{ color: "#c00", marginBottom: 18, fontWeight: 700, fontSize: "1.4rem" }}>
              Login Error
            </h2>
            <div style={{ color: "#222", fontSize: "1.08rem", marginBottom: 18 }}>
              {errorMsg}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;