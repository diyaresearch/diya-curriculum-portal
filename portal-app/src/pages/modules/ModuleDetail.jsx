import { useParams } from "react-router-dom";
import aiExplorationImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiInsightsImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png";
import aiPhysicsImg from "../../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";

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
    boxSizing: "border-box"
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
            { title: "Lecture on AI Fundamentals", desc: "Introductory lecture discussing the main concepts of AI.", type: "Lecture", locked: false },
            { title: "Quiz on AI Basics", desc: "Test your knowledge on what you've learned.", type: "Quiz", locked: true },
            { title: "Assignment: Explore AI Tools", desc: "Research and present your favorite AI tool.", type: "Assignment", locked: false }
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
            { title: "Lecture: Deep Learning", desc: "Dive into deep learning concepts.", type: "Lecture", locked: false },
            { title: "Project: AI in Healthcare", desc: "Explore AI applications in healthcare.", type: "Project", locked: false }
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
            { title: "Lecture: AI for Physics", desc: "How AI is used in physics research.", type: "Lecture", locked: false },
            { title: "Experiment: Simulate Physics", desc: "Use AI tools to simulate physics problems.", type: "Experiment", locked: false }
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
    const module = MODULES[moduleId] || DEFAULT_MODULE;

    return (
        <div style={{
            fontFamily: "Open Sans, Arial, sans-serif",
            background: "#fff",
            minHeight: "100vh",
            padding: 0
        }}>
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

            {/* Learning Resources */}
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                ...sectionRowStyle,
                alignItems: "flex-start",
                paddingTop: 80
            }}>
                <div style={sectionLeftStyle}>Learning Resources</div>
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    marginLeft: 0,
                    width: "100%"
                }}>
                    {module.resources.map((res, idx) => (
                        <div key={res.title} style={resourceCardStyle}>
                            <div style={{
                                width: 56,
                                height: 56,
                                background: "#eaeaea",
                                borderRadius: 8,
                                marginRight: 16,
                                flexShrink: 0
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: 4 }}>{res.title}</div>
                                <div style={{ color: "#888", fontSize: 16, marginBottom: 8 }}>{res.desc}</div>
                                <div style={{ fontSize: 15, color: "#444", marginBottom: 4 }}>{res.type}</div>
                                <span style={{
                                    fontSize: 13,
                                    color: "#222",
                                    background: "#f5f5f5",
                                    borderRadius: 3,
                                    padding: "3px 10px"
                                }}>
                                    {res.locked ? "Locked" : "Unlocked"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModuleDetail;