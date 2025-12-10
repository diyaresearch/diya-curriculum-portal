import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import useUserData from "../hooks/useUserData";


const HeroSection = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const { userData, logout } = useUserData();


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
                    minHeight: "200px",
                    background: "#162040",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "50px 0"
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
                    {role === "teacherDefault" && (
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
                            onClick={() => navigate("/upgrade")}
                        >
                            Upgrade Now
                        </button>
                    )}
                </div>
            </section>
        );
    }

    // Show signup section for non-logged in users
    return (
        <section
            style={{
                width: "100%",
                minHeight: "200px",
                background: "#162040",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 0"
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
                        fontSize: "3rem",
                        fontWeight: "700",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        letterSpacing: "0.5px",
                        margin: 0,
                        lineHeight: "1.1",
                        textShadow: "0 2px 4px rgba(0,0,0,0.3)"
                    }}
                >
                    Empower the Future with AI &amp; Data Science
                </h1>
                <p
                    style={{
                        color: "#FDCB58",
                        fontSize: "1.4rem",
                        fontWeight: "600",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        marginTop: "24px",
                        marginBottom: "32px",
                        lineHeight: "1.3",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase"
                    }}
                >
                    Learn. Explore. Create with Data.
                </p>
                <p
                    style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "1.25rem",
                        fontWeight: "400",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        marginTop: "0",
                        lineHeight: "1.7",
                        maxWidth: "580px",
                        margin: "0 auto"
                    }}
                >
                    Unlock potential through hands-on AI and Data Science learning experiences designed for K12 students and educators.
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
                            background: "#FDCB58",
                            color: "#162040",
                            border: "none",
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
                    <button
                        style={{
                            background: "transparent",
                            color: "#FDCB58",
                            border: "1px solid #FDCB58",
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
                </div>
                <p
                    style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: "0.9rem",
                        fontWeight: "400",
                        fontFamily: "Open Sans, sans-serif",
                        textAlign: "center",
                        marginTop: "32px",
                        lineHeight: "1.4",
                        margin: "32px 0 0 0"
                    }}
                >
                    Trusted by 1,000+ students and teachers worldwide
                </p>
            </div>
        </section>
    );
};

export default HeroSection;