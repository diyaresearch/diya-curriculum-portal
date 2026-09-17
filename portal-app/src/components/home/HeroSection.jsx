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
                className="w-full min-h-50 bg-navy flex items-center justify-center py-12.5 px-0"
            >
                <div
                    className="w-full max-w-150 my-0 mx-auto flex flex-col items-center justify-center"
                >
                    <h1
                        className="text-white text-page-title font-bold font-sans text-center tracking-[1.2px] m-0 leading-[1.2]"
                    >
                        Welcome to your Dashboard
                    </h1>
                    <p
                        className="text-white text-[1.15rem] font-normal font-sans text-center mt-7 leading-[1.6]"
                    >
                        Access educational content and enhance your classroom experience.
                    </p>
                    {role === ROLES.TEACHER_DEFAULT && (
                        <button
                            className="bg-accent-strong text-black border border-white rounded-md py-3.5 px-8 text-label font-semibold cursor-pointer [transition:background_0.2s,_color_0.2s,_border_0.2s] mt-10"
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
            className="w-full min-h-50 bg-navy flex items-center justify-center py-5 px-0"
        >
            <div
                className="w-full max-w-150 my-0 mx-auto flex flex-col items-center justify-center"
            >
                <h1
                    className="text-white text-[3rem] font-bold font-sans text-center tracking-[0.5px] m-0 leading-[1.1] [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]"
                >
                    Empower the Future with AI &amp; Data Science
                </h1>
                <p
                    className="text-[#fdcb58] text-[1.4rem] font-semibold font-sans text-center mt-6 mb-8 leading-[1.3] tracking-[0.5px] uppercase"
                >
                    Learn. Explore. Create with Data.
                </p>
                <p
                    className="[color:rgba(255,_255,_255,_0.9)] text-section-title font-normal font-sans text-center mt-0 leading-[1.7] max-w-145 my-0 mx-auto"
                >
                    Unlock potential through hands-on AI and Data Science learning experiences designed for K12 students and educators.
                </p>
                <div
                    className="flex gap-6 mt-10"
                >
                    <button
                        className="bg-[#fdcb58] text-navy border-0 rounded-md py-3.5 px-8 text-label font-semibold cursor-pointer [transition:background_0.2s,_color_0.2s,_border_0.2s]"
                        onClick={() => navigate("/teacher-signup")}
                    >
                        Sign Up as Teacher
                    </button>
                    <button
                        className="bg-transparent text-[#fdcb58] border border-[#fdcb58] rounded-md py-3.5 px-8 text-label font-semibold cursor-pointer [transition:background_0.2s,_color_0.2s,_border_0.2s]"
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