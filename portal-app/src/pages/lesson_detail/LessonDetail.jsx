import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

// Lock/Unlock icons
const LockIcon = ({ isLocked }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", top: "12px", left: "12px" }}>
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

// Sample lesson content data - this would normally come from a database
const LESSON_CONTENT = {
    "ai-exploration": {
        0: { // Introduction to Java Arrays
            subject: "Computer Science",
            duration: "45 minutes",
            description: "This lesson introduces students to the concept of arrays in Java, a fundamental data structure that stores a fixed-size sequential collection of elements of the same type. Students will learn how to declare, initialize, and access arrays, and will also explore common operations performed on arrays.",
            objectives: [
                "Understand the purpose and structure of arrays in Java.",
                "Learn how to declare, initialize, and manipulate arrays in Java."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "This section introduces the concept of arrays in Java and how they differ from other data structures.",
                    content: "Array fundamentals and declaration syntax",
                    link: "https://example.com/java-arrays-intro"
                },
                {
                    title: "Section 2",
                    description: "Learn how to initialize arrays and access individual elements.",
                    content: "Array initialization and element access",
                    link: "https://example.com/java-arrays-access"
                }
            ]
        },
        1: { // Quiz on AI Basics
            subject: "Computer Science",
            duration: "20 minutes",
            description: "Test your understanding of AI fundamentals with this comprehensive quiz covering basic concepts, applications, and terminology.",
            objectives: [
                "Assess comprehension of AI basic concepts.",
                "Evaluate understanding of AI applications and terminology."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "Multiple choice questions on AI basics.",
                    content: "Quiz: AI Fundamentals",
                    link: "https://example.com/ai-quiz-basics"
                }
            ]
        },
        2: { // Assignment: Explore AI Tools
            subject: "Computer Science",
            duration: "60 minutes",
            description: "Research and present your favorite AI tool, analyzing its functionality, use cases, and impact on users.",
            objectives: [
                "Research and analyze AI tools in depth.",
                "Present findings in a structured format."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "Guidelines for researching AI tools and creating presentations.",
                    content: "Assignment: AI Tool Research Project",
                    link: "https://example.com/ai-tool-assignment"
                }
            ]
        }
    },
    "ai-insights": {
        0: { // Lecture: Deep Learning
            subject: "Computer Science",
            duration: "50 minutes",
            description: "Dive into deep learning concepts, neural networks, and their applications in modern AI systems.",
            objectives: [
                "Understand neural network architecture and function.",
                "Learn about deep learning applications and limitations."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "Introduction to neural networks and deep learning fundamentals.",
                    content: "Deep Learning Fundamentals",
                    link: "https://example.com/deep-learning-intro"
                }
            ]
        },
        1: { // Project: AI in Healthcare
            subject: "Computer Science",
            duration: "90 minutes",
            description: "Explore AI applications in healthcare, including diagnostic tools, treatment planning, and patient care optimization.",
            objectives: [
                "Analyze AI applications in medical diagnosis.",
                "Evaluate the impact of AI on healthcare delivery."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "Research project on AI healthcare applications.",
                    content: "AI in Healthcare Research Project",
                    link: "https://example.com/ai-healthcare-project"
                }
            ]
        }
    },
    "ai-physics": {
        0: { // Lecture: AI for Physics
            subject: "Physics",
            duration: "40 minutes",
            description: "Learn how AI is revolutionizing physics research, from particle discovery to climate modeling.",
            objectives: [
                "Understand AI applications in physics research.",
                "Learn about computational physics and AI integration."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "AI applications in modern physics research and discovery.",
                    content: "AI in Physics Research",
                    link: "https://example.com/ai-physics-research"
                }
            ]
        },
        1: { // Experiment: Simulate Physics
            subject: "Physics",
            duration: "75 minutes",
            description: "Use AI tools to simulate physics problems, from simple motion to complex systems analysis.",
            objectives: [
                "Apply AI tools to physics problem solving.",
                "Understand computational simulation techniques."
            ],
            sections: [
                {
                    title: "Section 1",
                    description: "Hands-on physics simulation using AI tools.",
                    content: "Physics Simulation Lab",
                    link: "https://example.com/physics-simulation-lab"
                }
            ]
        }
    }
};

const LessonDetail = () => {
    const { moduleId, lessonIndex } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Get lesson data from URL state or fallback to static data
    const lessonFromState = location.state?.lesson;
    const fromAllLessonPlans = location.state?.fromAllLessonPlans || false;

    // Get lesson content from our static data
    const lessonContent = LESSON_CONTENT[moduleId]?.[parseInt(lessonIndex)];

    // Determine back button text and navigation
    const backButtonText = fromAllLessonPlans ? "Back to Lesson Plans" : "Back to Module";
    const backButtonAction = () => {
        if (fromAllLessonPlans) {
            navigate(`/all-lesson-plans/${moduleId}`);
        } else {
            navigate(`/modules/${moduleId}`);
        }
    };

    if (!lessonContent) {
        return (
            <div style={{ padding: "100px 20px", textAlign: "center" }}>
                <h2>Lesson not found</h2>
                <button
                    onClick={backButtonAction}
                    style={{
                        background: "#162040",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "12px 24px",
                        fontSize: "1rem",
                        cursor: "pointer"
                    }}
                >
                    {backButtonText}
                </button>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: "Open Sans, Arial, sans-serif",
            background: "#fff",
            minHeight: "100vh",
            padding: "40px 20px"
        }}>
            <div style={{
                maxWidth: 800,
                margin: "0 auto"
            }}>
                {/* Header with Back Button */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 40
                }}>
                    <h1 style={{
                        fontSize: "2rem",
                        fontWeight: "700",
                        color: "#111",
                        margin: 0
                    }}>
                        Lesson Plan
                    </h1>
                    <button
                        onClick={backButtonAction}
                        style={{
                            background: "#162040",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "12px 24px",
                            fontSize: "1rem",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        {backButtonText}
                    </button>
                </div>

                {/* Lesson Title */}
                <h2 style={{
                    fontSize: "1.8rem",
                    fontWeight: "600",
                    color: "#222",
                    marginBottom: 40,
                    textAlign: "center"
                }}>
                    {lessonFromState?.title || `Lesson ${parseInt(lessonIndex) + 1}`}
                </h2>

                {/* Lesson Subject */}
                <div style={{ marginBottom: 24 }}>
                    <strong style={{ fontSize: "1.1rem", color: "#162040" }}>Lesson Subject:</strong>
                    <div style={{ marginTop: 8, fontSize: "1rem", color: "#222" }}>
                        {lessonContent.subject}
                    </div>
                </div>

                {/* Difficulty Level */}
                <div style={{ marginBottom: 24 }}>
                    <strong style={{ fontSize: "1.1rem", color: "#162040" }}>Difficulty Level:</strong>
                    <div style={{ marginTop: 8, fontSize: "1rem", color: "#222" }}>
                        Beginner
                    </div>
                </div>

                {/* Lesson Duration */}
                <div style={{ marginBottom: 24 }}>
                    <strong style={{ fontSize: "1.1rem", color: "#162040" }}>Lesson Duration:</strong>
                    <div style={{ marginTop: 8, fontSize: "1rem", color: "#222" }}>
                        {lessonContent.duration}
                    </div>
                </div>

                {/* Lesson Description */}
                <div style={{ marginBottom: 32 }}>
                    <strong style={{ fontSize: "1.1rem", color: "#162040" }}>Lesson Description:</strong>
                    <div style={{
                        marginTop: 8,
                        fontSize: "1rem",
                        color: "#222",
                        lineHeight: 1.6
                    }}>
                        {lessonContent.description}
                    </div>
                </div>

                {/* Lesson Objectives */}
                <div style={{ marginBottom: 32 }}>
                    <strong style={{ fontSize: "1.1rem", color: "#162040" }}>Lesson Objectives:</strong>
                    <div style={{ marginTop: 8 }}>
                        {lessonContent.objectives.map((objective, index) => (
                            <div key={index} style={{
                                fontSize: "1rem",
                                color: "#222",
                                marginBottom: 8,
                                paddingLeft: 20,
                                lineHeight: 1.5
                            }}>
                                {index + 1}. {objective}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sections */}
                {lessonContent.sections.map((section, index) => (
                    <div key={index} style={{ marginBottom: 32 }}>
                        <strong style={{ fontSize: "1.1rem", color: "#162040" }}>
                            {section.title}
                        </strong>
                        <div style={{
                            marginTop: 8,
                            fontSize: "1rem",
                            color: "#222",
                            lineHeight: 1.6,
                            marginBottom: 12
                        }}>
                            {section.description}
                        </div>
                        <div style={{
                            background: "#f8f9fa",
                            border: "1px solid #e9ecef",
                            borderRadius: 8,
                            padding: 16
                        }}>
                            <div style={{
                                fontSize: "1rem",
                                color: "#444",
                                marginBottom: 8
                            }}>
                                <strong>Content:</strong> {section.content}
                            </div>
                            <a
                                href={section.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "#162040",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                    fontSize: "0.95rem"
                                }}
                            >
                                View Resource →
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LessonDetail;