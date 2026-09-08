import module1 from "@/assets/modules/module1.png";
import module2 from "@/assets/modules/module2.png";
import module3 from "@/assets/modules/module3.png";
import module4 from "@/assets/modules/module4.png";
import module5 from "@/assets/modules/module5.png";

/**
 * The featured modules the portal ships with. They are real editorial content,
 * not placeholder data - but they live in code rather than Firestore, so they
 * have no document ids and their resources have no lesson ids.
 *
 * Kept here rather than inside module_detail (#444) because the lesson view
 * reached from a featured module's resource list needs the same records: it
 * used to carry its own parallel copy, invented out of example.com links.
 */
export const FEATURED_MODULES = {
  "python-for-ai": {
    title: "PYTHON FOR AI",
    subtitle: "Master Python basics for AI: variables, functions, and essential libraries like NumPy and Pandas for data manipulation and analysis.",
    image: module4,
    description: "Learn Python programming fundamentals specifically for AI applications. This module covers essential programming concepts, data structures, and libraries used in artificial intelligence development.",
    requirements: "No prior programming experience required.",
    learningObjectives: "By the end of this module, students will be comfortable writing basic Python programs and using NumPy and Pandas for simple data manipulation and analysis tasks.",
    details: [
      { label: "Category", value: "Artificial Intelligence" },
      { label: "Level", value: "Beginner" },
      { label: "Type", value: "Interactive Course" },
      { label: "Duration", value: "120 minutes" },
    ],
    resources: [
      { title: "Python Basics", desc: "Variables, functions, and control flow, the building blocks used throughout the rest of the module.", type: "Lesson Plan", locked: false },
      { title: "NumPy and Pandas Primer", desc: "Hands-on introduction to the two libraries used across the AI curriculum for data manipulation.", type: "Lesson Plan", locked: false },
      { title: "Data Wrangling Exercise", desc: "Practice cleaning and analyzing a small dataset end to end.", type: "Assignment", locked: false },
    ],
  },
  "ai-exploration": {
    title: "AI EXPLORATION",
    subtitle: "Explore the fundamentals of artificial intelligence and discover how AI is transforming our world.",
    image: module1, // "AI Exploration" has no artwork of its own yet
    description: "This comprehensive module introduces students to the exciting world of artificial intelligence. Learn about machine learning, neural networks, and real-world AI applications.",
    requirements: "Basic computer literacy and curiosity about technology.",
    learningObjectives: "By the end of this module, students will understand core AI concepts, be able to identify AI applications in daily life, and have hands-on experience with simple AI tools.",
    details: [
      { label: "Category", value: "Artificial Intelligence" },
      { label: "Level", value: "Beginner" },
      { label: "Type", value: "Interactive Course" },
      { label: "Duration", value: "120 minutes" },
    ],
    resources: [
      { title: "Introduction to AI Fundamentals", desc: "Learn the core ideas behind AI and where it shows up in everyday life.", type: "Lesson Plan", locked: false },
      { title: "AI Applications Quiz", desc: "Test your understanding of real-world AI applications.", type: "Assignment", locked: false },
      { title: "Build Your First AI Tool", desc: "A hands-on project to explore simple AI tooling and workflows.", type: "Project", locked: false }
    ]
  },
  "ai-insights": {
    title: "AI INSIGHTS",
    subtitle: "Dive deeper into advanced AI concepts and their practical applications in various industries.",
    image: module2,
    description: "Building on foundational knowledge, this module explores advanced AI techniques, ethical considerations, and industry applications.",
    requirements: "Completion of AI Exploration module or equivalent background knowledge.",
    learningObjectives: "Students will master intermediate AI concepts, understand ethical implications of AI, and be able to evaluate AI solutions for real-world problems.",
    details: [
      { label: "Category", value: "Artificial Intelligence" },
      { label: "Level", value: "Intermediate" },
      { label: "Type", value: "Advanced Course" },
      { label: "Duration", value: "180 minutes" },
    ],
    resources: [
      { title: "Deep Learning Concepts", desc: "Understand neural networks, training, and evaluation at a high level.", type: "Lecture", duration: 60, locked: false },
      { title: "AI Ethics Discussion", desc: "Explore bias, fairness, and responsible AI design with examples.", type: "Discussion", duration: 30, locked: false },
      { title: "AI Healthcare Project Plan", desc: "Apply AI reasoning to a healthcare-style scenario and present findings.", type: "Project", duration: 90, locked: false },
    ],
  },
  "ai-physics": {
    title: "AI & PHYSICS",
    subtitle: "Discover how artificial intelligence is revolutionizing physics research and scientific discovery.",
    image: module3,
    description: "Explore the fascinating intersection of AI and physics, from particle physics simulations to astronomical data analysis.",
    requirements: "Basic understanding of physics concepts and familiarity with AI fundamentals.",
    learningObjectives: "Learn how AI accelerates physics research, understand machine learning applications in scientific discovery, and explore career opportunities at the intersection of AI and physics.",
    details: [
      { label: "Category", value: "Physics, AI" },
      { label: "Level", value: "Intermediate" },
      { label: "Type", value: "Specialized Course" },
      { label: "Duration", value: "150 minutes" },
    ],
    resources: [
      { title: "AI in Physics Research", desc: "Survey where AI is used in modern physics workflows.", type: "Lesson Plan", locked: false },
      { title: "Physics Simulation Lab", desc: "Hands-on activity exploring simulations and interpretation.", type: "Assignment", locked: false },
      { title: "Quantum Computing & AI", desc: "Project: compare how AI can help analyze complex physics data.", type: "Project", locked: false },
    ],
  },
  "chemistry-ai": {
    title: "CHEMISTRY & AI",
    subtitle: "AI-driven chemistry: molecular prediction, drug discovery processes, and automated chemical analysis using machine learning.",
    image: module5,
    description: "Explore how artificial intelligence revolutionizes chemistry through molecular modeling, drug discovery, and chemical analysis. Learn how AI accelerates research and development in chemical sciences.",
    requirements: "Basic chemistry knowledge and familiarity with AI fundamentals.",
    learningObjectives: "Students will understand how machine learning models are applied to molecular prediction and drug discovery, and evaluate AI-assisted chemical analysis workflows.",
    details: [
      { label: "Category", value: "Chemistry, AI" },
      { label: "Level", value: "Intermediate" },
      { label: "Type", value: "Specialized Course" },
      { label: "Duration", value: "150 minutes" },
    ],
    resources: [
      { title: "AI in Chemistry Research", desc: "Survey where machine learning is used in modern chemistry workflows.", type: "Lesson Plan", locked: false },
      { title: "Molecular Modeling Lab", desc: "Hands-on activity exploring computational molecular prediction.", type: "Assignment", locked: false },
      { title: "Drug Discovery Case Study", desc: "Project: examine how AI accelerates a real drug discovery pipeline.", type: "Project", locked: false },
    ],
  },
  "biology-ai": {
    title: "BIOLOGY & AI",
    subtitle: "Advanced bioinformatics: genomic analysis, protein folding prediction, and medical AI applications in modern healthcare.",
    image: module1,
    description: "Dive into bioinformatics and computational biology. This advanced module covers AI applications in genomics, protein structure prediction, and medical diagnostics using cutting-edge machine learning techniques.",
    requirements: "Completion of AI Insights module or equivalent background in AI and basic biology.",
    learningObjectives: "Students will understand how AI is applied to genomic analysis and protein structure prediction, and evaluate its role in medical diagnostics.",
    details: [
      { label: "Category", value: "Biology, AI" },
      { label: "Level", value: "Advanced" },
      { label: "Type", value: "Specialized Course" },
      { label: "Duration", value: "180 minutes" },
    ],
    resources: [
      { title: "Genomics and AI", desc: "Introduction to how machine learning is applied to genomic data.", type: "Lecture", duration: 60, locked: false },
      { title: "Protein Folding Prediction", desc: "Explore how AI models predict protein structure.", type: "Discussion", duration: 30, locked: false },
      { title: "Medical Diagnostics Project", desc: "Project: evaluate an AI-assisted diagnostic scenario.", type: "Project", duration: 90, locked: false },
    ],
  },
};
