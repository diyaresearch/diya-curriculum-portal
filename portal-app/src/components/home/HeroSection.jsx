import React, { useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { useAuth } from "@/context/AuthProvider";
import { ROLES } from "@/constants/roles";


const HeroSection = () => {
    const navigate = useNavigate();
    // Was: a bare useUserData() call for its side effects, plus its own
    // onAuthStateChanged and its own users/{uid} read - three ways of asking
    // the same question. All of it is the provider's job now (#368).
    const { user, role } = useAuth();

    useEffect(() => {
        // ONLY redirect if user is teacherPlus AND on home page
        if (role === ROLES.TEACHER_PLUS && window.location.pathname === "/") {
            navigate("/teacher-plus");
        }
    }, [role, navigate]);

    // ONLY hide the component for teacherPlus users (they get redirected)
    if (role === ROLES.TEACHER_PLUS) {
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
                    {role === ROLES.TEACHER_DEFAULT && (
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
                {/* "Trusted by 1,000+ students and teachers worldwide" removed (#433) —
                    unsourced claim on a pre-GA product. Reinstate once there's a real number. */}
            </div>
        </section>
    );
};

export default HeroSection;