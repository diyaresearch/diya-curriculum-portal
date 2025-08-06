import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";

const HeroSection = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const db = getFirestore(firebaseApp);
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const teacherDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
                if (teacherDoc.exists()) {
                    const userData = teacherDoc.data();
                    setRole(userData.role);

                    // ONLY redirect if user is teacherPlus AND on home page
                    if (userData.role === "teacherPlus" && window.location.pathname === "/") {
                        navigate("/teacher-plus");
                        return; // Exit early so component doesn't render
                    }
                    return;
                }

                const studentDoc = await getDoc(doc(db, "students", firebaseUser.uid));
                if (studentDoc.exists()) {
                    setRole(studentDoc.data().role);
                    return;
                }
                setRole(null);
            } else {
                setUser(null);
                setRole(null);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // ONLY hide the component for teacherPlus users (they get redirected)
    if (role === "teacherPlus") {
        return null; // Don't render anything, redirect will happen
    }

    // Show dashboard section for logged in users (students, teacherDefault)
    if (user) {
        return (
            <section
                style={{
                    width: "100%",
                    minHeight: "520px",
                    background: "#162040",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "100px 0"
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "600px",
                        margin: "0 auto",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <h1
                        style={{
                            color: "#fff",
                            fontSize: "2.5rem",
                            fontWeight: "700",
                            fontFamily: "Open Sans, sans-serif",
                            textAlign: "center",
                            letterSpacing: "1.2px",
                            margin: 0,
                            lineHeight: "1.2"
                        }}
                    >
                        Welcome to your Dashboard
                    </h1>
                    <p
                        style={{
                            color: "#fff",
                            fontSize: "1.15rem",
                            fontWeight: "400",
                            fontFamily: "Open Sans, sans-serif",
                            textAlign: "center",
                            marginTop: "28px",
                            lineHeight: "1.6"
                        }}
                    >
                        Access educational content and enhance your classroom experience.
                    </p>
                    <button
                        style={{
                            background: "#FFC940",
                            color: "#000",
                            border: "1px solid #fff",
                            borderRadius: "6px",
                            padding: "14px 32px",
                            fontSize: "1.08rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background 0.2s, color 0.2s, border 0.2s",
                            marginTop: "40px"
                        }}
                        onClick={() => navigate("/lesson-generator")}
                    >
                        Create Module
                    </button>
                </div>
            </section>
        );
    }

    // Show signup section for non-logged in users
    return (
        <section
            style={{
                width: "100%",
                minHeight: "520px",
                background: "#162040",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "100px 0"
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "600px",
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <h1
                    style={{
                        color: "#fff",
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        letterSpacing: "1.2px",
                        margin: 0,
                        lineHeight: "1.2"
                    }}
                >
                    Empower the Future with AI &amp; Data Science
                </h1>
                <p
                    style={{
                        color: "#fff",
                        fontSize: "1.15rem",
                        fontWeight: "400",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        marginTop: "28px",
                        lineHeight: "1.6"
                    }}
                >
                    Unlock potential through hands-on learning experiences for K12 educators and students.
                </p>
                <div
                    style={{
                        display: "flex",
                        gap: "24px",
                        marginTop: "40px"
                    }}
                >
                    <button
                        style={{
                            background: "#FFC940",
                            color: "#000",
                            border: "1px solid #fff",
                            borderRadius: "6px",
                            padding: "14px 32px",
                            fontSize: "1.08rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background 0.2s, color 0.2s, border 0.2s",
                        }}
                        onClick={() => navigate("/student-signup")}
                    >
                        Sign Up as Student
                    </button>
                    <button
                        style={{
                            background: "#FFC940",
                            color: "#000",
                            border: "1px solid #fff",
                            borderRadius: "6px",
                            padding: "14px 32px",
                            fontSize: "1.08rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background 0.2s, color 0.2s, border 0.2s",
                        }}
                        onClick={() => navigate("/teacher-signup")}
                    >
                        Sign Up as Teacher
                    </button>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;