
import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from '../../firebase/firebaseConfig';
import { query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
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

      await addDoc(collection(db, "teachers"), {
        fullName,
        email: cleanEmail, // store cleaned email
        school,
        subjects,
        grades,
        role: "teacherDefault", // <-- add this line
        createdAt: new Date(),
      });

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
    const handleGoogleLogin = async () => {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        alert("Google login failed: " + error.message);
      }
    };

    return (
      <SignupSuccess
        name={registeredName}
        type="Teacher"
        onLogin={handleGoogleLogin}
      />
    );
  }

  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Teacher</h1>
        <p>
          Join our platform to access AI and Data Science resources for your classrooms.
        </p>
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
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
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value.trim().toLowerCase())}
            />

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

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </main>
      </div>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
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

      await addDoc(collection(db, "students"), {
        fullName,
        email: cleanEmail, // store cleaned email
        grade,
        role: "student",
        createdAt: new Date(),
      });

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
    const handleGoogleLogin = async () => {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        alert("Google login failed: " + error.message);
      }
    };

    return (
      <SignupSuccess
        name={registeredName}
        type="Student"
        onLogin={handleGoogleLogin}
      />
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
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
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
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value.trim().toLowerCase())}
            />

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

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}