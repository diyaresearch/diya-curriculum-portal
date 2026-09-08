import React, { useState } from "react";
import useUserData from "@/hooks/useUserData";
import logo from "@/assets/DIYA_Logo.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import defaultUserIcon from "@/assets/default_user_icon.png";
import { startGoogleRedirect } from "@/auth/googleAuth";
import { useToast } from "@/components/ui/ToastProvider";
import { ROLES } from "@/constants/roles";

// The navbar's shared item box, written once (#360).
//
// This declaration block was inlined SIX times - as a `navLinkStyle` object
// for two links, and character-for-character as a literal for the other four
// - so changing the navbar's type scale meant six edits and reliably got
// five. The two spellings had already drifted: only the literal copies set
// `cursor: pointer`, so the Profile and Admin links did not show a pointer.
const NAV_ITEM =
  "flex h-14 items-center px-5 font-sans text-[15px] font-semibold tracking-[1.5px] text-ink";

// A clickable item adds the affordances. The resets matter because this class
// lands on both <button> and <Link>: without them a button would keep the
// user agent's border and background and render a hair differently from the
// links beside it.
// The two choices in the "no account exists" popup differ only in colour.
const SIGNUP_CHOICE =
  "w-full rounded-md border-0 py-3 text-base font-semibold text-white cursor-pointer";

const NAV_LINK =
  `${NAV_ITEM} bg-transparent border-0 outline-none cursor-pointer ` +
  "[text-underline-offset:20px] hover:underline";

const Navbar = () => {
  const toast = useToast();
  const { userData, logout } = useUserData();
  // Was a local mirror kept in sync by this component's own auth listener.
  const { user } = useAuth();
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    userType: "Teacher",
    jobTitle: "",
    subjects: "",
  });

  const navigate = useNavigate();
  const location = useLocation();


  // The URL is the only source of truth for this popup - closing it strips the
  // param. It used to be mirrored into state by an effect, which stored the
  // rendered JSX itself: a stale closure that also defeated memoization (#525).
  const showSignUpPopup =
    new URLSearchParams(location.search).get("showSignUpPopup") === "1";

  // A login failure message. A string, not the rendered element - the popup
  // below decides how to display it.
  const [loginError, setLoginError] = useState("");

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
      toast.error("Signup failed. Please check your information and try again.");
    }
  };

  // Render the error popup content
  function renderSignUpError() {
    return (
      <div>
        No account exists for this Google account.
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/student-signup" className="no-underline">
            <button className={`${SIGNUP_CHOICE} bg-[#2563eb] mb-2`}>Sign Up as Student</button>
          </Link>
          <Link to="/teacher-signup" className="no-underline">
            <button className={`${SIGNUP_CHOICE} bg-navy`}>Sign Up as Teacher</button>
          </Link>
        </div>
      </div>
    );
  }

  // Remove the query param and close popup
  const closeErrorPopup = () => {
    setLoginError("");
    const params = new URLSearchParams(location.search);
    params.delete("showSignUpPopup");
    navigate({ search: params.toString() }, { replace: true });
  };

  // Google login handler with Firestore check
  const handleGoogleLogin = async () => {
    setLoginError("");
    try {
      await startGoogleRedirect({
        returnTo: `${location.pathname}${location.search || ""}`,
      });
    } catch (error) {
      setLoginError(error?.message || "Login failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const role = userData?.role;
  const isTeacherDefault = role === ROLES.TEACHER_DEFAULT;
  const isTeacherPlus = role === ROLES.TEACHER_PLUS;
  const isAdmin = role === ROLES.ADMIN;
  const homeTo = isTeacherPlus ? "/teacherplus" : "/";

  return (
    <>
      <nav className="w-full h-20 min-h-20 bg-surface px-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-5">
          <a href={import.meta.env.VITE_DIYA_BASE_URL} target="_blank" rel="noopener noreferrer">
            <img
              src={logo}
              alt="Logo"
              className="h-[65px] w-[55px] rounded-[10%] object-contain border border-rule"
            />
          </a>
          <span className="font-sans text-[1.6rem] font-semibold tracking-[1px] text-black">
            DIYA Ed Portal
          </span>
        </div>

        <div className="flex items-center space-x-0 ml-auto">
          <Link
            to={homeTo}
            className={NAV_LINK}
          >
            Home
          </Link>

          {/* #443: the only admin user-management UI (/user-profile) had no inbound link */}
          {user && (
            <Link to="/user-profile" className={NAV_LINK}>
              Profile
            </Link>
          )}
          {isAdmin && (
            <Link to="/user-profile" className={NAV_LINK}>
              Admin
            </Link>
          )}

          {/* Conditional nav links based on user role */}
          {isTeacherDefault && (
            <Link
              to="/upgrade"
              className={NAV_LINK}
            >
              Upgrade
            </Link>
          )}


          {isTeacherPlus && (
            <button
              onClick={() => navigate('/cancel-subscription')}
              className={NAV_LINK}
            >
              Cancel Subscription
            </button>
          )}

          {!isTeacherDefault && !isTeacherPlus && (
            // "About" is about DIYA the organisation, and lives on the
            // organisation's own site - /about never existed here (#442).
            <a
              href={import.meta.env.VITE_DIYA_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={NAV_LINK}
            >
              About
            </a>
          )}

          {!user ? (
            <button
              onClick={handleGoogleLogin}
              className={NAV_LINK}
            >
              Log in
            </button>
          ) : (
            <>
              <div
                className={`${NAV_ITEM} space-x-2`}
              >
                <img
                  src={defaultUserIcon}
                  alt="User Profile"
                  className="w-9 h-9 rounded-full border-2 border-black shadow-md mr-3 object-cover bg-surface-sunken p-0.5"
                />
                <span className="font-semibold">
                  {userData?.fullName || "Profile"}
                  {userData?.role && (
                    <span className="font-normal text-[0.95em]">
                      {" "}({userData.role})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className={NAV_LINK}
              >
                Logout
              </button>
            </>
          )}
        </div>
        {isSignUpModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800/50">
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
      {(showSignUpPopup || loginError) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45">
          <div className="relative bg-surface rounded-2xl px-8 py-10 min-w-[340px] max-w-[400px] text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <button
              onClick={closeErrorPopup}
              className="absolute top-3 right-[18px] bg-transparent border-0 text-[1.7rem] text-ink-faint cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="mb-[18px] text-[1.4rem] font-bold text-danger">Login Error</h2>
            <div className="mb-[18px] text-[1.08rem] text-ink">
              {showSignUpPopup ? renderSignUpError() : loginError}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;