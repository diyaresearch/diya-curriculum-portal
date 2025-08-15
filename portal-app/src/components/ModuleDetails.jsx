import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

// Using placeholder images
const moduleImages = {
    aiExploration: "https://via.placeholder.com/360x240/4f46e5/ffffff?text=AI+Exploration",
    aiInsights: "https://via.placeholder.com/360x240/059669/ffffff?text=AI+Insights",
    aiPhysics: "https://via.placeholder.com/360x240/dc2626/ffffff?text=AI+%26+Physics",
    fallback: "https://via.placeholder.com/360x240/6b7280/ffffff?text=Module+Image"
};

// Hardcoded data for featured modules
const HARDCODED_MODULES = {
    'ai-exploration': {
        title: 'AI EXPLORATION',
        subtitle: 'Explore the fundamentals of artificial intelligence and discover how AI is transforming our world.',
        image: moduleImages.aiExploration,
        description: 'This comprehensive module introduces students to the exciting world of artificial intelligence. Learn about machine learning, neural networks, and real-world AI applications.',
        requirements: 'Basic computer literacy and curiosity about technology.',
        learningObjectives: 'By the end of this module, students will understand core AI concepts, be able to identify AI applications in daily life, and have hands-on experience with simple AI tools.',
        details: [
            { label: "Category", value: "Artificial Intelligence" },
            { label: "Level", value: "Beginner" },
            { label: "Type", value: "Interactive Course" },
            { label: "Duration", value: "120 minutes" },
        ],
        resources: []
    },
    'ai-insights': {
        title: 'AI INSIGHTS',
        subtitle: 'Dive deeper into advanced AI concepts and their practical applications in various industries.',
        image: moduleImages.aiInsights,
        description: 'Building on foundational knowledge, this module explores advanced AI techniques, ethical considerations, and industry applications.',
        requirements: 'Completion of AI Exploration module or equivalent background knowledge.',
        learningObjectives: 'Students will master intermediate AI concepts, understand ethical implications of AI, and be able to evaluate AI solutions for real-world problems.',
        details: [
            { label: "Category", value: "Artificial Intelligence" },
            { label: "Level", value: "Intermediate" },
            { label: "Type", value: "Advanced Course" },
            { label: "Duration", value: "180 minutes" },
        ],
        resources: []
    },
    'ai-physics': {
        title: 'AI & PHYSICS',
        subtitle: 'Discover how artificial intelligence is revolutionizing physics research and scientific discovery.',
        image: moduleImages.aiPhysics,
        description: 'Explore the fascinating intersection of AI and physics, from particle physics simulations to astronomical data analysis.',
        requirements: 'Basic understanding of physics concepts and familiarity with AI fundamentals.',
        learningObjectives: 'Learn how AI accelerates physics research, understand machine learning applications in scientific discovery, and explore career opportunities at the intersection of AI and physics.',
        details: [
            { label: "Category", value: "Physics, AI" },
            { label: "Level", value: "Intermediate" },
            { label: "Type", value: "Specialized Course" },
            { label: "Duration", value: "150 minutes" },
        ],
        resources: []
    }
};

const ModuleDetails = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const [module, setModule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModule = async () => {
            try {
                // Check if it's a hardcoded featured module first
                if (HARDCODED_MODULES[moduleId]) {
                    setModule(HARDCODED_MODULES[moduleId]);
                    setLoading(false);
                    return;
                }

                // If not hardcoded, try to fetch from Firestore
                const db = getFirestore(firebaseApp);
                const moduleDoc = await getDoc(doc(db, 'module', moduleId));

                if (moduleDoc.exists()) {
                    setModule({ id: moduleDoc.id, ...moduleDoc.data() });
                } else {
                    console.log('No such module!');
                    setModule(null);
                }
            } catch (error) {
                console.error('Error fetching module:', error);
                setModule(null);
            } finally {
                setLoading(false);
            }
        };

        fetchModule();
    }, [moduleId]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
                fontSize: '1.2rem'
            }}>
                Loading...
            </div>
        );
    }

    if (!module) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
                textAlign: 'center'
            }}>
                <h2>Module not found</h2>
                <p>The module "{moduleId}" does not exist.</p>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: "Open Sans, Arial, sans-serif",
            background: "#fff",
            minHeight: "100vh",
            padding: 0
        }}>
            {/* Header Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: "64px 20px 0 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 48,
                textAlign: "center"
            }}>
                {/* Title Section */}
                <div style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 20
                }}>
                    <div style={{
                        fontWeight: 800,
                        fontSize: "3.2rem",
                        marginBottom: 28,
                        color: "#111",
                        letterSpacing: "-1px",
                        textAlign: "center",
                        width: "100%",
                        lineHeight: "1.1"
                    }}>
                        {module.title}
                    </div>
                    <div style={{
                        color: "#444",
                        fontSize: "1.5rem",
                        fontWeight: 500,
                        textAlign: "center",
                        maxWidth: "800px",
                        lineHeight: "1.4"
                    }}>
                        {module.subtitle}
                    </div>
                </div>

                {/* Image Section */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div style={{
                        width: 360,
                        height: 240,
                        background: "#eaeaea",
                        borderRadius: 14,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <img
                            src={module.image || moduleImages.fallback}
                            alt={module.title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: 14
                            }}
                            onError={e => {
                                e.target.src = moduleImages.fallback;
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Module Details Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "96px auto 0 auto",
                padding: "0 20px"
            }}>
                <div style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 24,
                    textAlign: "left"
                }}>
                    Module Details
                </div>

                {/* Details Table - EXACTLY like featured modules */}
                <div style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 8,
                    overflow: "hidden"
                }}>
                    {module.details?.map((item, idx) => (
                        <div
                            key={item.label}
                            style={{
                                display: "flex",
                                borderBottom: idx < module.details.length - 1 ? "1px solid #ececec" : "none"
                            }}
                        >
                            <div style={{
                                padding: "20px 24px",
                                width: "200px",
                                fontWeight: 600,
                                color: "#444",
                                borderRight: "1px solid #ececec",
                                background: "#f8f9fa"
                            }}>
                                {item.label}
                            </div>
                            <div style={{
                                flex: 1,
                                padding: "20px 24px",
                                color: item.label === "Category" && item.value.includes(",") ? "#007bff" :
                                    item.label === "Level" ? "#007bff" :
                                        item.label === "Type" ? "#007bff" :
                                            item.label === "Duration" ? "#007bff" : "#222"
                            }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Requirements Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "80px auto 0 auto",
                padding: "0 20px"
            }}>
                <div style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 24,
                    textAlign: "left"
                }}>
                    Requirements
                </div>
                <div style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 8,
                    padding: "24px",
                    color: "#007bff",
                    lineHeight: "1.6"
                }}>
                    {module.requirements || 'No specific requirements'}
                </div>
            </div>

            {/* Module Description Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "80px auto 0 auto",
                padding: "0 20px"
            }}>
                <div style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 24,
                    textAlign: "left"
                }}>
                    Module Description
                </div>
                <div style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 8,
                    padding: "24px",
                    color: "#007bff",
                    lineHeight: "1.6"
                }}>
                    {module.description || 'No description available'}
                </div>
            </div>

            {/* Learning Objectives Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "80px auto 0 auto",
                padding: "0 20px"
            }}>
                <div style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 24,
                    textAlign: "left"
                }}>
                    Learning Objectives
                </div>
                <div style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 8,
                    padding: "24px",
                    color: "#007bff",
                    lineHeight: "1.6"
                }}>
                    {module.learningObjectives || 'Learning objectives will be defined'}
                </div>
            </div>

            {/* Lesson Plans Section - EXACTLY like featured modules */}
            <div style={{
                maxWidth: 1100,
                margin: "80px auto 0 auto",
                padding: "0 20px",
                paddingBottom: "80px"
            }}>
                <div style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 24,
                    textAlign: "left"
                }}>
                    Lesson Plans
                </div>

                {/* All Lesson Plans Button */}
                <div style={{ marginBottom: 24 }}>
                    <button
                        onClick={() => navigate(`/all-lesson-plans/${moduleId}`)}
                        style={{
                            background: "#162040",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "14px 20px",
                            fontSize: "1rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "background 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.target.style.background = "#0f1530"}
                        onMouseLeave={(e) => e.target.style.background = "#162040"}
                    >
                        All Lesson Plans
                    </button>
                </div>

                {/* Lesson Plans List */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                }}>
                    {/* Sample lesson plans for this module */}
                    {[
                        {
                            title: moduleId === 'ai-exploration' ? "Introduction to AI Fundamentals" :
                                moduleId === 'ai-insights' ? "Deep Learning Concepts" :
                                    "AI in Physics Research",
                            duration: "45 min",
                            type: "Lesson Plan"
                        },
                        {
                            title: moduleId === 'ai-exploration' ? "AI Applications Quiz" :
                                moduleId === 'ai-insights' ? "AI Ethics Discussion" :
                                    "Physics Simulation Lab",
                            duration: "30 min",
                            type: "Assignment"
                        },
                        {
                            title: moduleId === 'ai-exploration' ? "Build Your First AI Tool" :
                                moduleId === 'ai-insights' ? "AI Healthcare Project" :
                                    "Quantum Computing & AI",
                            duration: "60 min",
                            type: "Project"
                        }
                    ].map((lesson, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(`/lesson/${moduleId}/${index}`, {
                                state: {
                                    lesson: {
                                        title: lesson.title,
                                        desc: `Learn about ${lesson.title.toLowerCase()}`,
                                        type: lesson.type,
                                        locked: false
                                    },
                                    moduleTitle: module.title,
                                    moduleId: moduleId
                                }
                            })}
                            style={{
                                background: "#fff",
                                border: "1px solid #ececec",
                                borderRadius: 8,
                                padding: "20px 24px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                e.target.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                                e.target.style.transform = "translateY(0)";
                            }}
                        >
                            <div>
                                <div style={{
                                    fontWeight: 600,
                                    color: "#222",
                                    fontSize: "1.1rem",
                                    marginBottom: 4
                                }}>
                                    {lesson.title}
                                </div>
                                <div style={{
                                    color: "#666",
                                    fontSize: "0.9rem"
                                }}>
                                    {lesson.type} • {lesson.duration}
                                </div>
                            </div>
                            <div style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center"
                            }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Simple PDF download simulation
                                        const link = document.createElement('a');
                                        link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Lesson Plan: ${lesson.title}\nDuration: ${lesson.duration}\nType: ${lesson.type}`);
                                        link.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lesson_plan.txt`;
                                        link.click();
                                    }}
                                    style={{
                                        background: "#f8f9fa",
                                        color: "#162040",
                                        border: "1px solid #dee2e6",
                                        borderRadius: 6,
                                        padding: "8px 16px",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    Download PDF
                                </button>
                                <div style={{
                                    color: "#162040",
                                    fontSize: "1.2rem"
                                }}>
                                    →
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No lesson plans message if needed */}
                {(!HARDCODED_MODULES[moduleId]) && (
                    <div style={{
                        textAlign: "center",
                        color: "#666",
                        fontStyle: "italic",
                        padding: "40px 0"
                    }}>
                        No lesson plans available for this module.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModuleDetails;