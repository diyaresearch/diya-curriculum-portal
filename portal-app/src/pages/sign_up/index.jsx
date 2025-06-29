import React, { useState } from "react";
import { collection, setDoc, doc, query, where, getDocs } from "firebase/firestore";
import { db } from '../../firebase/firebaseConfig';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { MultiSelectDropdown, SingleSelectDropdown } from "../../components/Dropdowns";
import SignupSuccess from "../../components/SignupSuccess";

const SUBJECT_OPTIONS = [
  "CS",
  "AI & DS",
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
];

const GRADE_OPTIONS = ["5 or lower", "6–8", "9–12"];

// Shared login handler for both forms, now returns a boolean for account existence
async function handleGoogleLogin(setError, setShowNoAccountPopup) {
  setError("");
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // Check both collections for this email
    const teacherDoc = await getDocs(query(collection(db, "teachers"), where("email", "==", user.email)));
    const studentDoc = await getDocs(query(collection(db, "students"), where("email", "==", user.email)));
    if (teacherDoc.empty && studentDoc.empty) {
      await signOut(auth);
      setShowNoAccountPopup(true);
      return false;
    }
    // else: proceed as normal (user is in Firestore)
    window.location.href = "/"; // or use navigate if using react-router
    return true;
  } catch (error) {
    setError(error.message || "Login failed. Please try again.");
    return false;
  }
}

export function TeacherSignup() {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [showNoAccountPopup, setShowNoAccountPopup] = useState(false);

  // Require Google sign-in before registration
  const handleGoogleSignup = async () => {
    setError("");
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setGoogleUser(result.user);
      setEmail(result.user.email); // Pre-fill email
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!googleUser) {
      setError("Please sign in with Google first.");
      return;
    }
    if (!fullName || !email || !school || subjects.length === 0 || grades.length === 0 || !confirm) {
      setError("Please fill all fields and confirm you are a teacher.");
      return;
    }
    setLoading(true);
    try {
      // Check for existing teacher with this email (case-insensitive)
      const q = query(collection(db, "teachers"), where("email", "==", cleanEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError("An account with this email already exists.");
        setLoading(false);
        return;
      }

      // Create a new teacher document with UID as doc ID
      await setDoc(doc(db, "teachers", googleUser.uid), {
        fullName,
        email: cleanEmail,
        school,
        subjects,
        grades,
        role: "teacherDefault",
        createdAt: new Date(),
      });

      // Log out after signup so user is not automatically logged in
      await signOut(getAuth());

      setLoading(false);
      setRegisteredName(fullName);
      setSignedUp(true);
    } catch (err) {
      setLoading(false);
      setError(err.message);
      console.error("Firestore error:", err.code, err.message);
    }
  };

  if (signedUp) {
    // Let the user click "Log in here!" to start the Google login flow
    return (
      <>
        <SignupSuccess
          name={registeredName}
          type="Teacher"
          onLogin={async () => {
            await handleGoogleLogin(setError, setShowNoAccountPopup);
          }}
        />
        {showNoAccountPopup && (
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
                onClick={() => setShowNoAccountPopup(false)}
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
                No account exists for this Google account.
              </div>
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
          </div>
        )}
      </>
    );
  }

  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Teacher</h1>
        <p>
          Join our platform to access AI and Data Science resources for your classrooms.
        </p>
        <button
          type="button"
          onClick={() => handleGoogleLogin(setError)}
          style={{
            marginTop: 16,
            background: "#FFC940",
            color: "#222",
            border: "1px solid #fff",
            borderRadius: "6px",
            padding: "10px 32px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            boxSizing: "border-box",
            display: "inline-block"
          }}
        >
          Already have an account? Log in.
        </button>
      </div>
      <div className="form-barrier">
        <main className="form-section">
          <div className="form-left">
            <h2>Teacher Profile Information</h2>
            <p>Please fill in the following information to create your teacher profile.</p>
          </div>
          <form className="form-right" onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <label>Email</label>
            {!googleUser ? (
              <button
                type="button"
                onClick={handleGoogleSignup}
                style={{
                  width: "100%",
                  background: "#FFC940",
                  color: "#222",
                  border: "1px solid #bbb",
                  borderRadius: "6px",
                  padding: "10px 0",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginBottom: 8
                }}
              >
                Sign up with Google
              </button>
            ) : (
              <input
                type="email"
                value={email}
                disabled
                style={{ background: "#e3e8f0" }}
              />
            )}

            <label>School or Organization Name</label>
            <input
              type="text"
              placeholder="Enter your school or organization"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />

            <label>What Subjects do you teach?</label>
            <MultiSelectDropdown
              options={SUBJECT_OPTIONS}
              selected={subjects}
              setSelected={setSubjects}
              label="Subjects"
            />

            <label>What Grade level do you teach?</label>
            <MultiSelectDropdown
              options={GRADE_OPTIONS}
              selected={grades}
              setSelected={setGrades}
              label="Grade Levels"
            />

            <div className="confirm">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              <label>I confirm that I am a teacher</label>
            </div>

            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

            <button type="submit" className="register-btn" disabled={loading || !googleUser}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </main>
      </div>
      {error === "No account exists for this Google account. Please sign up first." && (
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
              onClick={() => setError("")}
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
              No account exists for this Google account. Please sign up first.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentSignup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [showNoAccountPopup, setShowNoAccountPopup] = useState(false);

  const handleGoogleSignup = async () => {
    setError("");
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setGoogleUser(result.user);
      setEmail(result.user.email);
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!googleUser) {
      setError("Please sign in with Google first.");
      return;
    }
    if (!fullName || !email || !grade || !confirm) {
      setError("Please fill all fields and confirm you are a student.");
      return;
    }
    setLoading(true);
    try {
      // Check for existing student with this email (case-insensitive)
      const q = query(collection(db, "students"), where("email", "==", cleanEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError("An account with this email already exists.");
        setLoading(false);
        return;
      }

      // Create a new student document with UID as doc ID
      await setDoc(doc(db, "students", googleUser.uid), {
        fullName,
        email: cleanEmail,
        grade,
        role: "student",
        createdAt: new Date(),
      });

      // Log out after signup so user is not automatically logged in
      await signOut(getAuth());

      setLoading(false);
      setRegisteredName(fullName);
      setSignedUp(true);
    } catch (err) {
      setLoading(false);
      setError(err.message);
      console.error("Firestore error:", err.code, err.message);
    }
  };

  if (signedUp) {
    return (
      <>
        <SignupSuccess
          name={registeredName}
          type="Student"
          onLogin={async () => {
            await handleGoogleLogin(setError, setShowNoAccountPopup);
          }}
        />
        {showNoAccountPopup && (
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
                onClick={() => setShowNoAccountPopup(false)}
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
                No account exists for this Google account.
              </div>
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
          </div>
        )}
      </>
    );
  }

  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Student</h1>
        <p>
          Join our platform to access AI and Data Science resources. Connect with
          your teacher's class or learn on your own.
        </p>
        <button
          type="button"
          onClick={() => handleGoogleLogin(setError)}
          style={{
            marginTop: 16,
            background: "#FFC940",
            color: "#222",
            border: "1px solid #fff",
            borderRadius: "6px",
            padding: "10px 32px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            boxSizing: "border-box",
            display: "inline-block"
          }}
        >
          Already have an account? Log in.
        </button>
      </div>
      <div className="form-barrier">
        <main className="form-section">
          <div className="form-left">
            <h2>Student Profile Information</h2>
            <p>Please fill in the following information to create your student profile.</p>
          </div>

          <form className="form-right" onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />

            <label>Email</label>
            {!googleUser ? (
              <button
                type="button"
                onClick={handleGoogleSignup}
                style={{
                  width: "100%",
                  background: "#FFC940",
                  color: "#222",
                  border: "1px solid #bbb",
                  borderRadius: "6px",
                  padding: "10px 0",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginBottom: 8
                }}
              >
                Sign up with Google
              </button>
            ) : (
              <input
                type="email"
                value={email}
                disabled
                style={{ background: "#e3e8f0" }}
              />
            )}

            <label>Grade Level</label>
            <SingleSelectDropdown
              options={["6th", "7th", "8th", "9th", "10th", "11th", "12th"]}
              selected={grade}
              setSelected={setGrade}
              label="Grade Level"
            />

            <div className="confirm">
              <input
                type="checkbox"
                checked={confirm}
                onChange={e => setConfirm(e.target.checked)}
              />
              <label>I confirm that I am a student</label>
            </div>

            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

            <button type="submit" className="register-btn" disabled={loading || !googleUser}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}