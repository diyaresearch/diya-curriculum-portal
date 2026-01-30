import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import BackButton from '../../components/BackButton';

// Import assets
import lessonPlansIcon from '../../assets/lesson_plans.png';
import textbooksIcon from '../../assets/textbooks.png';
import pencilIcon from '../../assets/pencil.png';

const AllLessonPlans = () => {
    const navigate = useNavigate();
    const { moduleId } = useParams();

    // Module metadata mapping
    const moduleInfo = {
        "ai-exploration": {
            title: "AI EXPLORATION",
            subtitle: "Explore the basics of AI and its applications."
        },
        "ai-insights": {
            title: "AI INSIGHTS",
            subtitle: "Dive deeper into AI concepts and real-world use cases."
        },
        "ai-physics": {
            title: "AI PHYSICS",
            subtitle: "Learn how AI is revolutionizing physics research."
        }
    };

    // Sample data - updated to match actual modules
    const allLessonPlans = [
        // AI Exploration Module
        {
            id: 1,
            moduleId: "ai-exploration",
            moduleTitle: "AI EXPLORATION",
            title: "Introduction to Java Arrays",
            type: "Lesson Plan",
            subject: "Computer Science",
            duration: "45 minutes",
            description: "Introductory lesson discussing the fundamentals of arrays in Java programming.",
            objectives: [
                "Understand the purpose and structure of arrays in Java.",
                "Learn how to declare, initialize, and manipulate arrays in Java."
            ],
            sections: [
                {
                    title: "Section 1",
                    content: "Array fundamentals and declaration syntax"
                },
                {
                    title: "Section 2",
                    content: "Array initialization and element access"
                }
            ],
            links: [
                "https://example.com/java-arrays-intro",
                "https://example.com/java-arrays-access"
            ]
        },
        {
            id: 2,
            moduleId: "ai-exploration",
            moduleTitle: "AI EXPLORATION",
            title: "Quiz on Array Basics",
            type: "Lesson Plan",
            subject: "Computer Science",
            duration: "20 minutes",
            description: "Test your knowledge on what you've learned about arrays.",
            objectives: [
                "Assess comprehension of AI basic concepts.",
                "Evaluate understanding of AI applications and terminology."
            ],
            sections: [
                {
                    title: "Section 1",
                    content: "Quiz: AI Fundamentals"
                }
            ],
            links: [
                "https://example.com/ai-quiz-basics"
            ]
        },
        {
            id: 3,
            moduleId: "ai-exploration",
            moduleTitle: "AI EXPLORATION",
            title: "Assignment: Array Operations",
            type: "Lesson Plan",
            subject: "Computer Science",
            duration: "60 minutes",
            description: "Practice implementing common array operations in Java.",
            objectives: [
                "Research and analyze AI tools in depth.",
                "Present findings in a structured format."
            ],
            sections: [
                {
                    title: "Section 1",
                    content: "Assignment: AI Tool Research Project"
                }
            ],
            links: [
                "https://example.com/ai-tool-assignment"
            ]
        },
        // AI Insights Module
        {
            id: 4,
            moduleId: "ai-insights",
            moduleTitle: "AI INSIGHTS",
            title: "Deep Learning Fundamentals",
            type: "Lesson Plan",
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
                    content: "Deep Learning Fundamentals"
                }
            ],
            links: [
                "https://example.com/deep-learning-intro"
            ]
        },
        {
            id: 5,
            moduleId: "ai-insights",
            moduleTitle: "AI INSIGHTS",
            title: "AI in Healthcare Research",
            type: "Lesson Plan",
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
                    content: "AI in Healthcare Research Project"
                }
            ],
            links: [
                "https://example.com/ai-healthcare-project"
            ]
        },
        // AI Physics Module
        {
            id: 6,
            moduleId: "ai-physics",
            moduleTitle: "AI PHYSICS",
            title: "AI in Physics Research",
            type: "Lesson Plan",
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
                    content: "AI in Physics Research"
                }
            ],
            links: [
                "https://example.com/ai-physics-research"
            ]
        },
        {
            id: 7,
            moduleId: "ai-physics",
            moduleTitle: "AI PHYSICS",
            title: "Physics Simulation with AI",
            type: "Lesson Plan",
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
                    content: "Physics Simulation Lab"
                }
            ],
            links: [
                "https://example.com/physics-simulation-lab"
            ]
        }
    ];

    const getResourceIcon = (type) => {
        const iconMap = {
            "Lesson Plan": lessonPlansIcon,
            "Quiz": textbooksIcon,
            "Assignment": pencilIcon
        };
        return iconMap[type] || lessonPlansIcon;
    };

    const handleLessonClick = (lesson) => {
        // Find the index of this lesson within the current module's lessons
        const moduleLessons = currentModuleLessons;
        const lessonIndex = moduleLessons.findIndex(l => l.id === lesson.id);

        // Navigate to lesson detail page with lesson data (matching ModuleDetail behavior)
        navigate(`/lesson/${moduleId}/${lessonIndex}`, {
            state: {
                lesson: {
                    title: lesson.title,
                    desc: lesson.description,
                    type: lesson.type,
                    locked: false // Default to unlocked since we're showing them
                },
                moduleTitle: lesson.moduleTitle,
                moduleId: moduleId,
                fromAllLessonPlans: true // Flag to indicate navigation came from all-lesson-plans page
            }
        });
    };

    const downloadPDF = (lesson, event) => {
        event.stopPropagation(); // Prevent card click when clicking download button

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 7;
        let yPosition = margin;

        // Helper function to add text with automatic line breaks
        const addWrappedText = (text, x, y, maxWidth, fontSize = 11) => {
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return y + (lines.length * lineHeight);
        };

        // Helper function to add a section
        const addSection = (title, content, currentY) => {
            // Add section title
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(title, margin, currentY);
            currentY += lineHeight + 2;

            // Add section content
            doc.setFont(undefined, 'normal');
            currentY = addWrappedText(content, margin, currentY, pageWidth - 2 * margin, 10);
            return currentY + 5;
        };

        // Title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        yPosition = addWrappedText(lesson.title, margin, yPosition, pageWidth - 2 * margin, 18);
        yPosition += 10;

        // Module information
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Module: ${lesson.moduleTitle}`, margin, yPosition);
        yPosition += lineHeight + 5;

        // Basic information
        doc.text(`Subject: ${lesson.subject}`, margin, yPosition);
        yPosition += lineHeight;
        doc.text(`Duration: ${lesson.duration}`, margin, yPosition);
        yPosition += lineHeight + 10;

        // Description
        yPosition = addSection("Description", lesson.description, yPosition);

        // Learning Objectives
        if (lesson.objectives && lesson.objectives.length > 0) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("Learning Objectives:", margin, yPosition);
            yPosition += lineHeight + 2;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            lesson.objectives.forEach((objective, index) => {
                const bulletText = `• ${objective}`;
                yPosition = addWrappedText(bulletText, margin + 5, yPosition, pageWidth - 2 * margin - 10, 10);
                yPosition += 2;
            });
            yPosition += 5;
        }

        // Lesson Sections
        if (lesson.sections && lesson.sections.length > 0) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("Lesson Sections:", margin, yPosition);
            yPosition += lineHeight + 5;

            lesson.sections.forEach((section, index) => {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = margin;
                }

                yPosition = addSection(`${index + 1}. ${section.title}`, section.content, yPosition);
            });
        }

        // Additional Resources
        if (lesson.links && lesson.links.length > 0) {
            // Check if we need a new page
            if (yPosition > 240) {
                doc.addPage();
                yPosition = margin;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("Additional Resources:", margin, yPosition);
            yPosition += lineHeight + 2;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            lesson.links.forEach((link, index) => {
                doc.text(`• ${link}`, margin + 5, yPosition);
                yPosition += lineHeight;
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated by DIYA Curriculum Portal - Page ${i} of ${pageCount}`,
                margin, doc.internal.pageSize.getHeight() - 10);
        }

        // Download the PDF
        const fileName = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lesson_plan.pdf`;
        doc.save(fileName);
    };

    // Filter lessons for the current module only
    const currentModuleLessons = allLessonPlans.filter(lesson => lesson.moduleId === moduleId);

    // Group lessons by module (will only have one module now)
    const lessonsByModule = currentModuleLessons.reduce((acc, lesson) => {
        if (!acc[lesson.moduleTitle]) {
            acc[lesson.moduleTitle] = [];
        }
        acc[lesson.moduleTitle].push(lesson);
        return acc;
    }, {});

    // Get current module info
    const currentModule = moduleInfo[moduleId] || { title: "Unknown Module", subtitle: "Module not found" };

    const resourceCardStyle = {
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        width: "100%"
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            {/* Header */}
            <div style={{
                background: "white",
                borderBottom: "1px solid #e9ecef",
                padding: "24px 0"
            }}>
                <div style={{
                    maxWidth: 1100,
                    margin: "0 auto",
                    padding: "0 20px"
                }}>
                    {/* Header with Back Button */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 20
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: "2.5rem",
                                fontWeight: 800,
                                color: "#111",
                                margin: 0,
                                letterSpacing: "-1px"
                            }}>
                                {currentModule.title} - Lesson Plans
                            </h1>
                            <p style={{
                                color: "#666",
                                fontSize: "1.1rem",
                                margin: "8px 0 0 0"
                            }}>
                                {currentModule.subtitle}
                            </p>
                        </div>
                        <BackButton to={`/module/${moduleId}`} label="Back" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: "40px 20px"
            }}>
                {Object.entries(lessonsByModule).map(([moduleTitle, lessons]) => (
                    <div key={moduleTitle} style={{ marginBottom: 60 }}>
                        <h2 style={{
                            fontSize: "1.8rem",
                            fontWeight: 700,
                            color: "#111",
                            marginBottom: 24,
                            borderBottom: "2px solid #007bff",
                            paddingBottom: 8
                        }}>
                            {moduleTitle}
                        </h2>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16
                        }}>
                            {lessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className="resource-card"
                                    style={resourceCardStyle}
                                    onClick={() => handleLessonClick(lesson)}
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
                                            src={getResourceIcon(lesson.type)}
                                            alt={lesson.type}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                objectFit: "contain"
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 600,
                                            color: "#111",
                                            fontSize: "1.1rem",
                                            marginBottom: 4
                                        }}>
                                            {lesson.title}
                                        </div>
                                        <div style={{
                                            color: "#666",
                                            fontSize: "0.9rem",
                                            marginBottom: 8
                                        }}>
                                            {lesson.type} • {lesson.subject} • {lesson.duration}
                                        </div>
                                        <div style={{
                                            color: "#777",
                                            fontSize: "0.85rem",
                                            lineHeight: "1.4"
                                        }}>
                                            {lesson.description}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => downloadPDF(lesson, e)}
                                        style={{
                                            background: "#162040",
                                            color: "white",
                                            border: "none",
                                            borderRadius: 4,
                                            padding: "8px 16px",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            marginLeft: 16,
                                            flexShrink: 0,
                                            transition: "background 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = "#0f1530"}
                                        onMouseLeave={(e) => e.target.style.background = "#162040"}
                                    >
                                        Download PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .resource-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default AllLessonPlans;
