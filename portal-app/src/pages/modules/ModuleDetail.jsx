import { useParams, useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import aiExplorationImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiInsightsImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png";
import aiPhysicsImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";
import lessonPlansIcon from "../../assets/lesson_plans.png";
import pencilIcon from "../../assets/pencil.png";
import textbooksIcon from "../../assets/textbooks.png";
import laptopIcon from "../../assets/laptop.png";
import microscopeIcon from "../../assets/microscope.png";

// Removed unused constants `details`, `requirements`, `descriptions`, `objectives`, and `resources`.
// Section title style: bold, left, vertically centered, larger
const sectionLeftStyle = {
    flex: "0 0 320px",
    fontWeight: 800,
    fontSize: "2rem",
    color: "#111",
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: 80
};

// Section row: much more vertical spacing, horizontal gap is controlled by marginLeft on table
const sectionRowStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    borderTop: "1px solid #ececec",
    paddingTop: 200,
    paddingBottom: 100,
    minHeight: 160,
    gap: 0
};

// Table: right side, controls horizontal gap from section title
const tableStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: 250, // horizontal gap between section title and table
    minWidth: 0
};

// Table row: less vertical padding, only one line, larger text
const tableRowStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #ececec"
};

// Table label: left, minimal right padding, larger text
const tableLabelStyle = {
    flex: 1,
    color: "#888",
    fontWeight: 500,
    fontSize: "1.25rem",
    textAlign: "left",
    paddingRight: 8,
    whiteSpace: "nowrap"
};

// Table value: right, minimal left padding, larger text
const tableValueStyle = {
    flex: 1,
    fontWeight: 700,
    fontSize: "1.25rem",
    color: "#162040",
    textAlign: "right",
    paddingLeft: 0,
    whiteSpace: "nowrap"
};

// For double column rows (requirements, description, objectives)
const doubleColRowStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #ececec"
};
const doubleColLeftStyle = {
    flex: 1,
    color: "#888",
    fontWeight: 500,
    fontSize: "1.25rem",
    textAlign: "left",
    paddingRight: 2,
    whiteSpace: "nowrap"
};
const doubleColRightStyle = {
    flex: 1,
    fontWeight: 700,
    fontSize: "1.25rem",
    color: "#162040",
    textAlign: "right",
    paddingLeft: 150,
    whiteSpace: "normal"
};

const resourceCardStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    background: "#fff",
    borderRadius: 12,
    padding: "20px 24px",
    minHeight: 80,
    gap: 16,
    border: "1px solid #ececec",
    marginBottom: 28,
    marginLeft: 250,
    width: "80%",
    boxSizing: "border-box",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease, transform 0.2s ease"
};

// Function to get icon based on resource type
const getResourceIcon = (type) => {
    const iconMap = {
        "Lesson Plan": lessonPlansIcon,
        "Lecture": textbooksIcon,
        "Quiz": pencilIcon,
        "Assignment": pencilIcon,
        "Project": laptopIcon,
        "Experiment": microscopeIcon
    };
    return iconMap[type] || lessonPlansIcon; // Default to lesson plans icon
};

// Define all unique module data here
const MODULES = {
    "ai-exploration": {
        title: "AI EXPLORATION",
        subtitle: "Explore the basics of AI and its applications.",
        image: aiExplorationImg,
        details: [
            { label: "Category", value: "AI" },
            { label: "Level", value: "Beginner" },
            { label: "Time Estimate", value: "2 hours" },
            { label: "Rating", value: "4.8/5" }
        ],
        requirements: [
            { left: "Python Programming", right: "Familiarity with computers and Internet" }
        ],
        descriptions: [
            { left: "In-depth AI knowledge", right: "Explore various AI applications and their impact." }
        ],
        objectives: [
            { left: "Understand AI Basics", right: "Learn the foundational concepts of AI" }
        ],
        resources: [
            { title: "Introduction to Java Arrays", desc: "Introductory lesson discussing the fundamentals of arrays in Java programming.", type: "Lesson Plan", locked: false },
            { title: "Quiz on Array Basics", desc: "Test your knowledge on what you've learned about arrays.", type: "Lesson Plan", locked: true },
            { title: "Assignment: Array Operations", desc: "Practice implementing common array operations in Java.", type: "Lesson Plan", locked: false }
        ]
    },
    "ai-insights": {
        title: "AI INSIGHTS",
        subtitle: "Dive deeper into AI concepts and real-world use cases.",
        image: aiInsightsImg,
        details: [
            { label: "Category", value: "AI" },
            { label: "Level", value: "Intermediate" },
            { label: "Time Estimate", value: "3 hours" },
            { label: "Rating", value: "4.7/5" }
        ],
        requirements: [
            { left: "Basic AI Knowledge", right: "Interest in real-world AI" }
        ],
        descriptions: [
            { left: "Advanced AI topics", right: "Learn about neural networks, deep learning, and more." }
        ],
        objectives: [
            { left: "Apply AI Concepts", right: "Use AI in real-world scenarios" }
        ],
        resources: [
            { title: "Lecture: Deep Learning", desc: "Dive into deep learning concepts.", type: "Lesson Plan", locked: false },
            { title: "Project: AI in Healthcare", desc: "Explore AI applications in healthcare.", type: "Lesson Plan", locked: false }
        ]
    },
    "ai-physics": {
        title: "AI & PHYSICS",
        subtitle: "Learn how AI is used in physics and scientific discovery.",
        image: aiPhysicsImg,
        details: [
            { label: "Category", value: "AI/Physics" },
            { label: "Level", value: "Basic" },
            { label: "Time Estimate", value: "1.5 hours" },
            { label: "Rating", value: "4.9/5" }
        ],
        requirements: [
            { left: "Interest in Physics", right: "Curiosity about AI" }
        ],
        descriptions: [
            { left: "Physics & AI", right: "Discover how AI is transforming physics research." }
        ],
        objectives: [
            { left: "Connect AI & Physics", right: "Understand AI's role in scientific discovery" }
        ],
        resources: [
            { title: "Lecture: AI for Physics", desc: "How AI is used in physics research.", type: "Lesson Plan", locked: false },
            { title: "Experiment: Simulate Physics", desc: "Use AI tools to simulate physics problems.", type: "Lesson Plan", locked: false }
        ]
    }
};


const DEFAULT_MODULE = {
    title: "Module Not Found",
    subtitle: "This module does not exist.",
    details: [],
    requirements: [],
    descriptions: [],
    objectives: [],
    resources: []
};

const ModuleDetail = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const module = MODULES[moduleId] || DEFAULT_MODULE;

    const handleLessonClick = (resource, index) => {
        // Navigate to lesson detail page with lesson data
        navigate(`/lesson/${moduleId}/${index}`, {
            state: {
                lesson: resource,
                moduleTitle: module.title,
                moduleId: moduleId
            }
        });
    };

    const handleDownloadPDF = (resource, index, event) => {
        // Prevent the card click event from firing
        event.stopPropagation();

        // Import lesson content data (same as in LessonDetail.jsx)
        const LESSON_CONTENT = {
            "ai-exploration": {
                0: {
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
                1: {
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
                2: {
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
                0: {
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
                1: {
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
                0: {
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
                1: {
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

        // Get the actual lesson content
        const lessonContent = LESSON_CONTENT[moduleId]?.[index];

        if (!lessonContent) {
            alert('Lesson content not found!');
            return;
        }

        // Generate PDF using jsPDF
        const pdf = new jsPDF();
        const fileName = `${resource.title.replace(/[^a-zA-Z0-9]/g, '_')}_lesson_plan.pdf`;

        // Set up fonts and colors
        const primaryColor = [22, 32, 64]; // #162040
        const textColor = [51, 51, 51]; // #333
        const lightTextColor = [136, 136, 136]; // #888

        let yPosition = 20;
        const lineHeight = 8;
        const margin = 20;
        const pageWidth = 210; // A4 width in mm

        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text(resource.title, margin, yPosition);

        // Add underline for title
        yPosition += 5;
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(...primaryColor);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);

        yPosition += 15;

        // Lesson Subject
        pdf.setFontSize(12);
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text('Lesson Subject:', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...textColor);
        pdf.text(lessonContent.subject, margin + 40, yPosition);
        yPosition += lineHeight;

        // Difficulty Level (static)
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text('Difficulty Level:', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...textColor);
        pdf.text('Beginner', margin + 40, yPosition);
        yPosition += lineHeight;

        // Lesson Duration
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text('Lesson Duration:', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...textColor);
        pdf.text(lessonContent.duration, margin + 40, yPosition);
        yPosition += lineHeight * 2;

        // Lesson Description
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text('Lesson Description:', margin, yPosition);
        yPosition += lineHeight;

        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...textColor);
        const descriptionLines = pdf.splitTextToSize(lessonContent.description, pageWidth - 2 * margin);
        pdf.text(descriptionLines, margin, yPosition);
        yPosition += descriptionLines.length * lineHeight + 10;

        // Lesson Objectives
        pdf.setFontSize(14);
        pdf.setTextColor(...primaryColor);
        pdf.setFont(undefined, 'bold');
        pdf.text('Lesson Objectives:', margin, yPosition);
        yPosition += lineHeight * 1.5;

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...textColor);
        lessonContent.objectives.forEach((objective, idx) => {
            const objectiveText = `${idx + 1}. ${objective}`;
            const objectiveLines = pdf.splitTextToSize(objectiveText, pageWidth - 2 * margin - 10);
            pdf.text(objectiveLines, margin + 10, yPosition);
            yPosition += objectiveLines.length * lineHeight;
        });

        yPosition += 10;

        // Sections
        lessonContent.sections.forEach((section, idx) => {
            // Check if we need a new page
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = 20;
            }

            // Section header
            pdf.setFontSize(14);
            pdf.setTextColor(...primaryColor);
            pdf.setFont(undefined, 'bold');
            pdf.text(section.title, margin, yPosition);
            yPosition += lineHeight * 1.5;

            // Section description
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(...textColor);
            const sectionLines = pdf.splitTextToSize(section.description, pageWidth - 2 * margin);
            pdf.text(sectionLines, margin, yPosition);
            yPosition += sectionLines.length * lineHeight + 5;

            // Content
            pdf.setTextColor(...primaryColor);
            pdf.setFont(undefined, 'bold');
            pdf.text('Content:', margin, yPosition);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(...textColor);
            pdf.text(section.content, margin + 25, yPosition);
            yPosition += lineHeight;

            // Link
            pdf.setTextColor(...primaryColor);
            pdf.setFont(undefined, 'bold');
            pdf.text('View Resource →', margin, yPosition);
            yPosition += lineHeight * 2;
        });

        // Footer
        const pageHeight = 297; // A4 height in mm
        pdf.setFontSize(10);
        pdf.setTextColor(...lightTextColor);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 15);
        pdf.text('DIYA Curriculum Portal', pageWidth - margin - 40, pageHeight - 15);

        // Save the PDF
        pdf.save(fileName);

        // Show success message
        console.log(`Downloaded "${resource.title}" lesson content as PDF successfully!`);
    };

    return (
        <div style={{
            fontFamily: "Open Sans, Arial, sans-serif",
            background: "#fff",
            minHeight: "100vh",
            padding: 0
        }}>
            <style>
                {`
                .resource-card:hover {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
                    transform: translateY(-2px) !important;
                }
                .resource-card {
                    box-shadow: none !important;
                    transform: translateY(0) !important;
                }
                `}
            </style>
            {/* Header: Title Left, Image Right */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: "64px 0 0 0",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 48
            }}>
                {/* Left: Title and Subtitle */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontWeight: 800,
                        fontSize: "3.2rem",
                        marginBottom: 28,
                        color: "#111",
                        letterSpacing: "-1px"
                    }}>
                        {module.title}
                    </div>
                    <div style={{
                        color: "#444",
                        fontSize: "1.5rem",
                        maxWidth: 520,
                        fontWeight: 500
                    }}>
                        {module.subtitle}
                    </div>
                </div>
                {/* Right: Image */}
                <div style={{
                    flex: "0 0 360px",
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
                            src={module.image}
                            alt={module.title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: 14
                            }}
                            onError={e => { e.target.style.display = "none"; }}
                        />
                    </div>
                </div>
            </div>

            {/* Module Details Section */}
            <div style={{
                maxWidth: 1100,
                margin: "96px auto 0 auto",
                ...sectionRowStyle
            }}>
                <div style={sectionLeftStyle}>
                    Module Details
                </div>
                <div style={tableStyle}>
                    {module.details.map((item, idx) => (
                        <div
                            key={item.label}
                            style={{
                                ...tableRowStyle,
                                borderBottom: idx < module.details.length - 1 ? "1px solid #ececec" : "none"
                            }}
                        >
                            <div style={tableLabelStyle}>{item.label}</div>
                            <div style={tableValueStyle}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Requirements */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                ...sectionRowStyle,
                paddingTop: 80
            }}>
                <div style={sectionLeftStyle}>Requirements</div>
                <div style={tableStyle}>
                    {module.requirements.map((item, idx) => (
                        <div
                            key={item.left}
                            style={{
                                ...doubleColRowStyle,
                                borderBottom: "none"
                            }}
                        >
                            <div style={doubleColLeftStyle}>{item.left}</div>
                            <div style={doubleColRightStyle}>{item.right}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Module Description */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                ...sectionRowStyle,
                paddingTop: 80
            }}>
                <div style={sectionLeftStyle}>Module Description</div>
                <div style={tableStyle}>
                    {module.descriptions.map((item, idx) => (
                        <div
                            key={item.left}
                            style={{
                                ...doubleColRowStyle,
                                borderBottom: "none"
                            }}
                        >
                            <div style={doubleColLeftStyle}>{item.left}</div>
                            <div style={doubleColRightStyle}>{item.right}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Learning Objectives */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                ...sectionRowStyle,
                paddingTop: 80
            }}>
                <div style={sectionLeftStyle}>Learning Objectives</div>
                <div style={tableStyle}>
                    {module.objectives.map((item, idx) => (
                        <div
                            key={item.left}
                            style={{
                                ...doubleColRowStyle,
                                borderBottom: "none"
                            }}
                        >
                            <div style={doubleColLeftStyle}>{item.left}</div>
                            <div style={doubleColRightStyle}>{item.right}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lesson Plans */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                ...sectionRowStyle,
                alignItems: "flex-start",
                paddingTop: 80
            }}>
                <div style={sectionLeftStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
                        <span>Lesson Plans</span>
                        <button
                            onClick={() => navigate(`/all-lesson-plans/${moduleId}`)}
                            style={{
                                background: "#162040",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "8px 16px",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "background 0.2s ease",
                                whiteSpace: "nowrap"
                            }}
                            onMouseEnter={(e) => e.target.style.background = "#0f1530"}
                            onMouseLeave={(e) => e.target.style.background = "#162040"}
                        >
                            See all Lesson Plans
                        </button>
                    </div>
                </div>
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    marginLeft: 0,
                    width: "100%"
                }}>
                    {module.resources.map((res, idx) => (
                        <div
                            key={res.title}
                            className="resource-card"
                            style={resourceCardStyle}
                            onClick={() => handleLessonClick(res, idx)}
                        >
                            <div style={{
                                width: 56,
                                height: 56,
                                background: "#f8f9fa",
                                borderRadius: 8,
                                marginRight: 16,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #e9ecef"
                            }}>
                                <img
                                    src={getResourceIcon(res.type)}
                                    alt={res.type}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        objectFit: "contain"
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: 4 }}>{res.title}</div>
                                <div style={{ color: "#888", fontSize: 16, marginBottom: 8 }}>{res.desc}</div>
                                <div style={{ fontSize: 15, color: "#444", marginBottom: 8 }}>{res.type}</div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: 12
                                }}>
                                    <span style={{
                                        fontSize: 13,
                                        color: "#222",
                                        background: "#f5f5f5",
                                        borderRadius: 3,
                                        padding: "3px 10px"
                                    }}>
                                        {res.locked ? "Locked" : "Unlocked"}
                                    </span>
                                    <button
                                        onClick={(e) => handleDownloadPDF(res, idx, e)}
                                        style={{
                                            background: "#162040",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 4,
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "background 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = "#0f1530";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = "#162040";
                                        }}
                                    >
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModuleDetail;