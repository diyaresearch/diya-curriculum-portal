import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import { FEATURED_MODULES } from "@/constants/featuredModules";

/**
 * The lesson view for a featured module's resource (#444).
 *
 * Featured modules live in code, so their resources have no Firestore lesson id
 * and cannot go through `/lesson/:lessonId`. This page used to fill that gap with
 * a second, invented copy of the curriculum - 138 lines of subjects, objectives
 * and `example.com` "View Resource" links that matched nothing in the module the
 * reader had just come from. It now renders the module's own record for the
 * resource, and says so plainly when there is nothing to show.
 */

const detailValue = (module, label) =>
  (module?.details || []).find((d) => d.label === label)?.value || "";

const LessonDetail = () => {
    const { moduleId, lessonIndex } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const module = FEATURED_MODULES[moduleId];
    const index = Number.parseInt(lessonIndex, 10);
    // Prefer what the module page handed over; fall back to the module record so
    // a shared or reloaded URL still renders.
    const resource = location.state?.lesson || module?.resources?.[index];

    const backToModule = () => navigate(`/module/${moduleId}`);

    if (!resource) {
        return (
            <div style={{ padding: "100px 20px", textAlign: "center" }}>
                <h2>Lesson not found</h2>
                <p style={{ marginTop: 12, color: "#555" }}>
                    This lesson is no longer part of the module.
                </p>
                <button
                    onClick={backToModule}
                    style={{
                        marginTop: 24,
                        background: "#162040",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "12px 24px",
                        fontSize: "1rem",
                        cursor: "pointer"
                    }}
                >
                    Back to Module
                </button>
            </div>
        );
    }

    const moduleTitle = location.state?.moduleTitle || module?.title;
    const fields = [
        ["Lesson Type", resource.type],
        ["Difficulty Level", detailValue(module, "Level")],
        ["Lesson Duration", resource.duration || detailValue(module, "Duration")],
    ].filter(([, value]) => !!value);

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
                        onClick={backToModule}
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
                        Back to Module
                    </button>
                </div>

                {/* Lesson Title */}
                <h2 style={{
                    fontSize: "1.8rem",
                    fontWeight: "600",
                    color: "#222",
                    marginBottom: 8,
                    textAlign: "center"
                }}>
                    {resource.title || `Lesson ${index + 1}`}
                </h2>

                {moduleTitle && (
                    <div style={{
                        textAlign: "center",
                        color: "#666",
                        fontSize: "0.95rem",
                        marginBottom: 40
                    }}>
                        {moduleTitle}
                    </div>
                )}

                {fields.map(([label, value]) => (
                    <div key={label} style={{ marginBottom: 24 }}>
                        <strong style={{ fontSize: "1.1rem", color: "#162040" }}>{label}:</strong>
                        <div style={{ marginTop: 8, fontSize: "1rem", color: "#222" }}>
                            {value}
                        </div>
                    </div>
                ))}

                {(resource.desc || resource.description) && (
                    <div style={{ marginBottom: 32 }}>
                        <strong style={{ fontSize: "1.1rem", color: "#162040" }}>
                            Lesson Description:
                        </strong>
                        <div style={{
                            marginTop: 8,
                            fontSize: "1rem",
                            color: "#222",
                            lineHeight: 1.6
                        }}>
                            {resource.desc || resource.description}
                        </div>
                    </div>
                )}

                {module?.learningObjectives && (
                    <div style={{ marginBottom: 32 }}>
                        <strong style={{ fontSize: "1.1rem", color: "#162040" }}>
                            Module Objectives:
                        </strong>
                        <div style={{
                            marginTop: 8,
                            fontSize: "1rem",
                            color: "#222",
                            lineHeight: 1.6
                        }}>
                            {module.learningObjectives}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonDetail;
