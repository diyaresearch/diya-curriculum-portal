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
            <div className="py-25 px-5 text-center">
                <h2>Lesson not found</h2>
                <p className="mt-3 text-[#555]">
                    This lesson is no longer part of the module.
                </p>
                <button
                    onClick={backToModule}
                    className="mt-6 bg-navy text-white border-0 rounded-md py-3 px-6 text-[1rem] cursor-pointer"
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
        <div className="font-sans bg-surface min-h-screen py-10 px-5">
            <div className="max-w-200 my-0 mx-auto">
                {/* Header with Back Button */}
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-[2rem] font-bold text-ink-strong m-0">
                        Lesson Plan
                    </h1>
                    <button
                        onClick={backToModule}
                        className="bg-navy text-white border-0 rounded-md py-3 px-6 text-[1rem] font-semibold cursor-pointer"
                    >
                        Back to Module
                    </button>
                </div>

                {/* Lesson Title */}
                <h2 className="text-[1.8rem] font-semibold text-ink mb-2 text-center">
                    {resource.title || `Lesson ${index + 1}`}
                </h2>

                {moduleTitle && (
                    <div className="text-center text-ink-muted text-meta mb-10">
                        {moduleTitle}
                    </div>
                )}

                {fields.map(([label, value]) => (
                    <div key={label} className="mb-6">
                        <strong className="text-[1.1rem] text-navy">{label}:</strong>
                        <div className="mt-2 text-[1rem] text-ink">
                            {value}
                        </div>
                    </div>
                ))}

                {(resource.desc || resource.description) && (
                    <div className="mb-8">
                        <strong className="text-[1.1rem] text-navy">
                            Lesson Description:
                        </strong>
                        <div className="mt-2 text-[1rem] text-ink leading-[1.6]">
                            {resource.desc || resource.description}
                        </div>
                    </div>
                )}

                {module?.learningObjectives && (
                    <div className="mb-8">
                        <strong className="text-[1.1rem] text-navy">
                            Module Objectives:
                        </strong>
                        <div className="mt-2 text-[1rem] text-ink leading-[1.6]">
                            {module.learningObjectives}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonDetail;
