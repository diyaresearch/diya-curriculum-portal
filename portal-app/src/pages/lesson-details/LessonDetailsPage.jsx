import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import DOMPurify from "dompurify";
import { COLLECTIONS } from "@/firebase/collectionNames";
import Loading from "@/components/ui/Loading";

const LessonDetailsPage = () => {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuggets, setNuggets] = useState({});

  useEffect(() => {
    let cancelled = false;
    const fetchLesson = async () => {
      const lessonRef = doc(db, COLLECTIONS.lesson, id);
      const lessonSnap = await getDoc(lessonRef);
      if (cancelled) return;
      if (lessonSnap.exists()) {
        setLesson(lessonSnap.data());
      }
      setLoading(false);
    };
    fetchLesson();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    // Fetch all nuggets referenced in sections
    if (lesson && Array.isArray(lesson.sections)) {
      const allContentIds = lesson.sections.flatMap(sec => sec.contentIds || []);
      if (allContentIds.length === 0) return;
      Promise.all(
        allContentIds.map(id =>
          getDoc(doc(db, COLLECTIONS.content, id)).then(snap =>
            snap.exists() ? { id, ...snap.data() } : null
          )
        )
      ).then(results => {
        const nuggetsMap = {};
        results.forEach(nugget => {
          if (nugget) nuggetsMap[nugget.id] = nugget;
        });
        setNuggets(nuggetsMap);
      });
    }
  }, [lesson]);

  if (loading) return <Loading variant="page" message="Loading lesson..." />;
  if (!lesson) return <div>Lesson not found.</div>;

  return (
    <div className="max-w-175 my-10 mx-auto bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-8">
      <h2 className="text-[2rem] font-bold mb-4">
        {lesson.title || lesson.Title || "Untitled Lesson"}
      </h2>

      {/* Description AFTER title */}
      {lesson.description && typeof lesson.description === "string" && (
        <div className="mb-4">
          <strong>Description:</strong>
          <div
            className="rich-text-content"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.description) }}
          />
        </div>
      )}

      {/* Objectives */}
      {Array.isArray(lesson.objectives) && lesson.objectives.length > 0 && (
        <div className="mb-4">
          <strong>Objectives:</strong>
          {lesson.objectives.map((obj, idx) => (
            <div
              key={idx}
              className="rich-text-content mb-2"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obj) }}
            />
          ))}
        </div>
      )}

      {/* Other fields except duration and sections */}
      {Object.entries(lesson).map(([key, value]) => {
        if (
          key === "title" ||
          key === "Title" ||
          key === "sections" ||
          key === "authorid" ||
          key === "authorId" ||
          key === "isPublic" ||
          key === "description" ||
          key === "duration" ||
          key === "objectives"
        ) return null;

        // Format createdAt field
        if (key === "createdAt" && value) {
          let dateObj;
          if (typeof value === "object" && value.seconds) {
            dateObj = new Date(value.seconds * 1000);
          } else {
            dateObj = new Date(value);
          }
          const formatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
          return (
            <div key={key} className="mb-4">
              <strong>Created At:</strong> {formatted}
            </div>
          );
        }

        return (
          <div key={key} className="mb-4">
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </div>
        );
      })}

      {/* Duration LAST */}
      {lesson.duration && (
        <div className="mb-4">
          <strong>Duration:</strong> {lesson.duration} minutes
        </div>
      )}

      {/* Sections AT THE BOTTOM */}
      {Array.isArray(lesson.sections) && lesson.sections.length > 0 && (
        <div className="mt-2 mb-8">
          <h3 className="text-[1rem] font-bold mb-3">Sections:</h3>
          {lesson.sections.map((section, idx) => (
            <div
              key={idx}
              className="mb-6 pt-4.5 pr-4.5 pb-3 pl-4.5 border border-rule rounded-[10px] bg-[#f9fafb] shadow-[0_2px_8px_rgba(22,32,64,0.04)]"
            >
              <div className="font-semibold text-[1rem] mb-2">
                {section.title || section.name || `Section ${idx + 1}`}
              </div>
              {section.intro && (
                <div
                  className="rich-text-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.intro) }}
                />
              )}
              {Array.isArray(section.contentIds) && section.contentIds.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {section.contentIds.map(contentId => {
                    const nugget = nuggets[contentId];
                    return (
                      <div
                        key={contentId}
                        className="bg-surface-subtle border border-rule rounded-lg py-3 px-4 min-w-45 max-w-65 mb-2 shadow-[0_2px_8px_rgba(22,32,64,0.06)] flex flex-col items-start"
                      >
                        <div className="font-bold text-label mb-1.5">
                          {nugget ? (
                            <Link
                              to={`/view-content/${contentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-link underline cursor-pointer"
                              title="View Nugget Details"
                            >
                              {nugget.title || nugget.Title || "Untitled Nugget"}
                            </Link>
                          ) : (
                            "Nugget not found"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-ink-faint italic">No nuggets in this section.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonDetailsPage;