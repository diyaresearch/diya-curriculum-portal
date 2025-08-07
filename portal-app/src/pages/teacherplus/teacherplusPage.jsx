import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '../../hooks/useUserData';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app as firebaseApp } from '../../firebase/firebaseConfig';

import {
    MODULE_CONTENT_TYPES,
    MODULE_CATEGORIES,
    MODULE_LEVELS,
} from '../../constants/moduleConstants';

import aiExploreImg from '../../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png';
import laptopImg from '../../assets/laptop.png';
import physicsImg from '../../assets/finphysics.png';

function capitalizeWords(str) {
    if (str === null || str === undefined) return 'N/A';
    const stringValue = String(str);
    return stringValue
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

const LockIcon = ({ isLocked }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 10,
            background: "rgba(255,255,255,0.95)",
            borderRadius: "6px",
            padding: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}
    >
        {isLocked ? (
            <>
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#dc3545" strokeWidth="2" fill="#fff" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#dc3545" strokeWidth="2" />
                <circle cx="12" cy="16" r="1" fill="#dc3545" />
            </>
        ) : (
            <>
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#28a745" strokeWidth="2" fill="#fff" />
                <path d="M7 11V7a5 5 0 0 1 10 0" stroke="#28a745" strokeWidth="2" />
                <circle cx="12" cy="16" r="1" fill="#28a745" />
            </>
        )}
    </svg>
);

const TeacherPlusPage = () => {
    const navigate = useNavigate();
    const { user, userData, loading } = useUserData();
    const role = userData?.role;

    useEffect(() => {
        if (!loading && (!user || role !== 'teacherPlus')) {
            navigate('/');
        }
    }, [user, role, loading, navigate]);

    const [contentType, setContentType] = useState("All");
    const [category, setCategory] = useState("All");
    const [level, setLevel] = useState("All");
    const [keyword, setKeyword] = useState("");
    const [lockStatus, setLockStatus] = useState("All");

    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [nuggets, setNuggets] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [filtersApplied, setFiltersApplied] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    useEffect(() => {
        const updateItemsPerPage = () => {
            const screenWidth = window.innerWidth;
            let itemsPerRow;
            if (screenWidth >= 1400) itemsPerRow = 3;
            else if (screenWidth >= 1000) itemsPerRow = 3;
            else if (screenWidth >= 800) itemsPerRow = 2;
            else itemsPerRow = 1;
            setItemsPerPage(itemsPerRow * 2);
        };
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, []);

    useEffect(() => {
        const db = getFirestore(firebaseApp);
        getDocs(collection(db, "module")).then(snapshot => {
            const moduleData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                moduleData.push({
                    id: doc.id,
                    title: data.title || "Untitled Module",
                    description: data.description || "",
                    image: data.image || "module1",
                    tags: data.tags || [],
                    level: data.level || "Basic",
                    category: data.category || "General",
                    lessonPlans: data.lessonPlans || {},
                    isDraft: data.isDraft || false,
                    _type: "Module"
                });
            });
            setModules(moduleData);
        }).catch(error => {
            console.error("Error fetching modules:", error);
        });

        getDocs(collection(db, "lesson")).then(snapshot => {
            setLessons(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isDraft: doc.data().isDraft || false,
                _type: "Lesson Plan"
            })));
        });

        getDocs(collection(db, "content")).then(snapshot => {
            setNuggets(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: "Nuggets"
            })));
        });
    }, []);

    useEffect(() => {
        if (!filtersApplied && (modules.length > 0 || lessons.length > 0 || nuggets.length > 0)) {
            const publishedModules = modules.filter(m => !m.isDraft);
            const publishedLessons = lessons.filter(l => !l.isDraft);
            setFilteredItems([...publishedModules, ...publishedLessons, ...nuggets]);
        }
    }, [modules, lessons, nuggets, filtersApplied]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    let paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredItems, itemsPerPage]);

    const handleApplyFilters = () => {
        let items = [];
        const publishedModules = modules.filter(m => !m.isDraft);
        const publishedLessons = lessons.filter(l => !l.isDraft);

        if (contentType === "All") {
            items = [...publishedModules, ...publishedLessons, ...nuggets];
        } else if (contentType === "Module") {
            items = publishedModules;
        } else if (contentType === "Lesson Plan") {
            items = publishedLessons;
        } else if (contentType === "Nuggets") {
            items = nuggets;
        }

        if (category !== "All") {
            items = items.filter(item => {
                let cat = item.category || item.Category || "";
                if (Array.isArray(cat)) cat = cat.join(", ");
                return cat.toString().toLowerCase() === category.toLowerCase();
            });
        }

        if (level !== "All") {
            items = items.filter(item => {
                let lvl = item.level || item.Level || "";
                if (Array.isArray(lvl)) lvl = lvl.join(", ");
                return lvl.toString().toLowerCase() === level.toLowerCase();
            });
        }

        if (keyword.trim()) {
            const kw = keyword.trim().toLowerCase();
            items = items.filter(item =>
                (item.title || item.Title || "").toLowerCase().includes(kw)
            );
        }

        if (lockStatus !== "All") {
            items = items.filter(item => {
                const isLocked = (item.role || item.Role) === "teacherPlus";
                return lockStatus === "Locked" ? isLocked : !isLocked;
            });
        }

        setFilteredItems(items);
        setFiltersApplied(true);
    };

    const handleResetFilters = () => {
        setContentType("All");
        setCategory("All");
        setLevel("All");
        setKeyword("");
        setLockStatus("All");
        setFilteredItems([]);
        setFiltersApplied(false);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div
            style={{
                width: "100%",
                background: "#F6F8FA",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}
        >

            {/* Header Section for TeacherPlus */}
            <section
                style={{
                    width: "100%",
                    background: "#242B42",
                    padding: "60px 0",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "60px",
                    color: "white"
                }}
            >
                <div style={{
                    flex: "1",
                    maxWidth: "500px",
                    paddingLeft: "40px"
                }}>
                    <h1 style={{
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        marginBottom: "16px",
                        color: "white"
                    }}>
                        Welcome Back, TeacherPlus User!
                    </h1>
                    <p style={{
                        fontSize: "1.1rem",
                        marginBottom: "32px",
                        color: "#e2e8f0"
                    }}>
                        Access advanced tools to enhance your teaching experience.
                    </p>
                    <button
                        onClick={() => navigate("/classroom-management")}
                        style={{
                            background: "#fbbf24",
                            color: "#1a202c",
                            border: "none",
                            borderRadius: "6px",
                            padding: "12px 32px",
                            fontSize: "1rem",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Manage My Classroom
                    </button>
                </div>
                <div style={{
                    flex: "1",
                    maxWidth: "400px",
                    height: "300px",
                    borderRadius: "8px",
                    marginRight: "40px"
                }}>
                    <div style={{
                        flex: "1",
                        maxWidth: "400px",
                        height: "300px",
                        borderRadius: "8px",
                        marginRight: "40px",
                        overflow: "hidden"
                    }}>
                        <img
                            src={laptopImg}
                            alt="Teaching Tools"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block"
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Create New Section */}
            <section
                style={{
                    width: "100%",
                    padding: "80px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}
            >
                <h2
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        color: "#111",
                        textAlign: "center",
                        margin: 0,
                        letterSpacing: "1px"
                    }}
                >
                    Create New
                </h2>
                <p
                    style={{
                        marginTop: "18px",
                        fontSize: "1.15rem",
                        color: "#222",
                        textAlign: "center",
                        maxWidth: "600px",
                        fontWeight: 500,
                        marginBottom: "60px"
                    }}
                >
                    Start creating your content now!
                </p>

                {/* Create New Tools */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "40px",
                        width: "100%",
                        maxWidth: "1100px",
                        flexWrap: "wrap"
                    }}
                >
                    {/* Create Module */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "320px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            border: "2px solid transparent"
                        }}
                        onClick={() => navigate("/module-builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            style={{
                                width: "80px",
                                height: "80px",
                                background: "#000",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px"
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                                <path d="M9 9h6v6H9z" fill="white" />
                                <path d="M9 3v6M15 3v6M3 9h6M3 15h6" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                color: "#222",
                                marginBottom: "12px",
                                textAlign: "center"
                            }}
                        >
                            Create Module
                        </h3>
                        <p
                            style={{
                                fontSize: "1rem",
                                color: "#666",
                                textAlign: "center",
                                maxWidth: "280px",
                                lineHeight: "1.5"
                            }}
                        >
                            Build a new module to teach.
                        </p>
                    </div>

                    {/* Create Lesson Plan */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "320px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            border: "2px solid transparent"
                        }}
                        onClick={() => navigate("/lesson-plans/builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            style={{
                                width: "80px",
                                height: "80px",
                                background: "#162040",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px"
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" />
                                <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" />
                                <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" />
                                <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" />
                                <polyline points="10,9 9,9 8,9" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                color: "#222",
                                marginBottom: "12px",
                                textAlign: "center"
                            }}
                        >
                            Create Lesson Plan
                        </h3>
                        <p
                            style={{
                                fontSize: "1rem",
                                color: "#666",
                                textAlign: "center",
                                maxWidth: "280px",
                                lineHeight: "1.5"
                            }}
                        >
                            Design a lesson plan for your classes.
                        </p>
                    </div>

                    {/* Create Nugget */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "320px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            border: "2px solid transparent"
                        }}
                        onClick={() => navigate("/nugget-builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            style={{
                                width: "80px",
                                height: "80px",
                                background: "#fbbf24",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px"
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                color: "#222",
                                marginBottom: "12px",
                                textAlign: "center"
                            }}
                        >
                            Create Nugget
                        </h3>
                        <p
                            style={{
                                fontSize: "1rem",
                                color: "#666",
                                textAlign: "center",
                                maxWidth: "280px",
                                lineHeight: "1.5"
                            }}
                        >
                            Share concise learning nuggets.
                        </p>
                    </div>
                </div>
            </section>

            {/* My Modules Section */}
            <section
                style={{
                    width: "100%",
                    padding: "80px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}
            >
                <h2
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        color: "#111",
                        textAlign: "center",
                        margin: 0,
                        letterSpacing: "1px"
                    }}
                >
                    My Modules
                </h2>
                <p
                    style={{
                        marginTop: "18px",
                        fontSize: "1.15rem",
                        color: "#222",
                        textAlign: "center",
                        maxWidth: "600px",
                        fontWeight: 500,
                    }}
                >
                    Your custom teaching modules.
                </p>
                <button
                    onClick={() => navigate("/add-module")}
                    style={{
                        marginTop: "32px",
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "12px 32px",
                        fontSize: "1rem",
                        fontWeight: "600",
                        cursor: "pointer"
                    }}
                >
                    Add New Module
                </button>

                {/* Three modules layout */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "40px",
                        marginTop: "60px",
                        width: "100%",
                        maxWidth: "1100px"
                    }}
                >
                    {/* Module 1 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-exploration")}
                    >
                        <LockIcon isLocked={false} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={aiExploreImg}
                                alt="AI Exploration"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "18px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Basics
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI Exploration
                            </span>
                        </div>
                    </div>

                    {/* Module 2 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-insights")}
                    >
                        <LockIcon isLocked={false} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={laptopImg}
                                alt="AI Insights"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "18px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Intermediary
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI Insights
                            </span>
                        </div>
                    </div>

                    {/* Module 3 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-physics")}
                    >
                        <LockIcon isLocked={false} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={physicsImg}
                                alt="AI & Physics"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "10px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Basic
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI & Physics
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Modules Section */}
            <section
                style={{
                    width: "100%",
                    padding: "80px 0 0 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}
            >
                <h2
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        color: "#111",
                        textAlign: "center",
                        margin: 0,
                        letterSpacing: "1px"
                    }}
                >
                    Featured Modules
                </h2>
                <p
                    style={{
                        marginTop: "18px",
                        fontSize: "1.15rem",
                        color: "#222",
                        textAlign: "center",
                        maxWidth: "600px",
                        fontWeight: 500,
                    }}
                >
                    Explore the latest modules available for your class.
                </p>

                {/* Three featured modules */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "40px",
                        marginTop: "60px",
                        width: "100%",
                        maxWidth: "1100px"
                    }}
                >
                    {/* Featured Module 1 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-exploration")}
                    >
                        <LockIcon isLocked={false} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={aiExploreImg}
                                alt="AI Exploration"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "18px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Basics
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI Exploration
                            </span>
                        </div>
                    </div>

                    {/* Featured Module 2 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-insights")}
                    >
                        <LockIcon isLocked={true} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={laptopImg}
                                alt="AI Insights"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "18px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Intermediary
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI Insights
                            </span>
                        </div>
                    </div>

                    {/* Featured Module 3 */}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            width: "340px",
                            height: "340px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative"
                        }}
                        onClick={() => navigate("/modules/ai-physics")}
                    >
                        <LockIcon isLocked={false} />
                        <div style={{
                            width: "100%",
                            height: "calc(100% - 70px)",
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center"
                        }}>
                            <img
                                src={physicsImg}
                                alt="AI & Physics"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />
                        </div>
                        <div style={{
                            width: "100%",
                            height: "90px",
                            padding: "10px 0 0 0",
                            textAlign: "center",
                            background: "#fff"
                        }}>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "600",
                                    fontSize: "1.15rem",
                                    color: "#162040",
                                    letterSpacing: "1px"
                                }}
                            >
                                Basic
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    fontWeight: "700",
                                    fontSize: "1.35rem",
                                    color: "#222",
                                    marginTop: "8px"
                                }}
                            >
                                AI & Physics
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter and Search Section */}
            <section
                style={{
                    width: "100%",
                    padding: "100px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}
            >
                <h2
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: "700",
                        color: "#111",
                        textAlign: "center",
                        margin: 0,
                        letterSpacing: "1px"
                    }}
                >
                    Filter and Search
                </h2>
                <p
                    style={{
                        marginTop: "18px",
                        fontSize: "1.15rem",
                        color: "#222",
                        textAlign: "center",
                        maxWidth: "600px",
                        fontWeight: 500,
                        marginBottom: 24
                    }}
                >
                    Select your preferences to filter available modules.
                </p>

                <div style={{
                    display: "flex",
                    gap: "32px",
                    flexWrap: "wrap",
                    marginBottom: "18px"
                }}>
                    {/* Content Type Filter */}
                    <div>
                        <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Content Type</label>
                        <select
                            value={contentType}
                            onChange={e => setContentType(e.target.value)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                fontSize: "1rem"
                            }}
                        >
                            {["All", ...MODULE_CONTENT_TYPES].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                fontSize: "1rem"
                            }}
                        >
                            {MODULE_CATEGORIES.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Level Filter */}
                    <div>
                        <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Level</label>
                        <select
                            value={level}
                            onChange={e => setLevel(e.target.value)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                fontSize: "1rem"
                            }}
                        >
                            {MODULE_LEVELS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lock Status Filter */}
                    <div>
                        <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Lock Status</label>
                        <select
                            value={lockStatus}
                            onChange={e => setLockStatus(e.target.value)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                fontSize: "1rem"
                            }}
                        >
                            <option value="All">All</option>
                            <option value="Unlocked">Unlocked</option>
                            <option value="Locked">Locked</option>
                        </select>
                    </div>
                </div>

                {/* Keyword Filter */}
                <div style={{ marginBottom: "18px", width: "100%", maxWidth: 400 }}>
                    <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>
                        Keyword
                    </label>
                    <input
                        type="text"
                        value={keyword || ""}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="Type a keyword to search..."
                        style={{
                            width: "100%",
                            padding: "8px 16px",
                            borderRadius: 6,
                            border: "1px solid #bbb",
                            fontSize: "1rem",
                            marginTop: 8
                        }}
                    />
                </div>

                {/* Filter Actions */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        style={{
                            padding: "8px 28px",
                            borderRadius: 6,
                            border: "1px solid #bbb",
                            background: "#fff",
                            color: "#222",
                            fontWeight: "600",
                            fontSize: "1rem",
                            cursor: "pointer"
                        }}
                    >
                        Reset Filters
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        style={{
                            padding: "8px 28px",
                            borderRadius: 6,
                            border: "none",
                            background: "#162040",
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "1rem",
                            cursor: "pointer"
                        }}
                    >
                        Apply Filters
                    </button>
                </div>

                {/* Results Grid */}
                <div
                    style={{
                        width: "100%",
                        minHeight: "60px",
                        background: "#f6f8fa",
                        borderRadius: "8px",
                        border: "1px dashed #bbb",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 380px)",
                        gridTemplateRows: "repeat(2, 380px)",
                        gap: "40px",
                        padding: "40px",
                        justifyContent: "center",
                        alignItems: "start",
                        color: "#888",
                        fontSize: "1.05rem",
                        fontStyle: "italic",
                        marginBottom: "16px",
                        boxSizing: "border-box",
                        maxWidth: "1300px",
                        margin: "0 auto"
                    }}
                >
                    {paginatedItems.length === 0 ? (
                        <div style={{
                            gridColumn: "1 / -1",
                            width: "100%",
                            textAlign: "center"
                        }}>
                            No modules found.
                        </div>
                    ) : (
                        paginatedItems.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    background: "#fff",
                                    borderRadius: "12px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                    width: "380px",
                                    height: "380px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    position: "relative",
                                    transition: "box-shadow 0.2s"
                                }}
                                onClick={() => {
                                    if (item._type === "Module") {
                                        navigate(`/modules/${item.id}`);
                                    } else if (item._type === "Lesson Plan") {
                                        navigate(`/lesson-plans/${item.id}`);
                                    } else if (item._type === "Nuggets") {
                                        navigate(`/nuggets/${item.id}`);
                                    }
                                }}
                            >
                                <LockIcon isLocked={(item.role || item.Role) === "teacherPlus"} />
                                <div style={{
                                    width: "100%",
                                    height: "calc(100% - 70px)",
                                    display: "flex",
                                    alignItems: "stretch",
                                    justifyContent: "center",
                                    background: "#f0f0f0"
                                }}>
                                    <img
                                        src={laptopImg}
                                        alt="Module"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block"
                                        }}
                                    />
                                </div>
                                <div style={{
                                    width: "100%",
                                    height: "100px",
                                    padding: "12px 0 0 0",
                                    textAlign: "center",
                                    background: "#fff"
                                }}>
                                    <span
                                        style={{
                                            display: "block",
                                            fontWeight: "700",
                                            fontSize: "1.15rem",
                                            color: "#222",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden"
                                        }}
                                    >
                                        {item.title || item.Title}
                                    </span>
                                    <span
                                        style={{
                                            display: "block",
                                            fontWeight: "600",
                                            fontSize: "1rem",
                                            color: "#162040",
                                            letterSpacing: "1px",
                                            marginTop: "2px"
                                        }}
                                    >
                                        {capitalizeWords(item.level || item.Level || "N/A")}
                                    </span>
                                    <span
                                        style={{
                                            display: "block",
                                            fontWeight: "600",
                                            fontSize: "1rem",
                                            color: "#162040",
                                            letterSpacing: "1px",
                                            marginTop: "2px"
                                        }}
                                    >
                                        {item._type}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "32px" }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: "10px 28px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                background: currentPage === 1 ? "#eee" : "#fff",
                                color: "#222",
                                fontWeight: "600",
                                fontSize: "1rem",
                                cursor: currentPage === 1 ? "not-allowed" : "pointer"
                            }}
                        >
                            Back
                        </button>
                        <span style={{ alignSelf: "center", fontWeight: "600", color: "#162040" }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: "10px 28px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                background: currentPage === totalPages ? "#eee" : "#fff",
                                color: "#222",
                                fontWeight: "600",
                                fontSize: "1rem",
                                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeacherPlusPage;