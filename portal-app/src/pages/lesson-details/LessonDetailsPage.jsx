import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const LessonDetailsPage = () => {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuggets, setNuggets] = useState({});

  useEffect(() => {
    const fetchLesson = async () => {
      const db = getFirestore();
      const lessonRef = doc(db, "lesson", id);
      const lessonSnap = await getDoc(lessonRef);
      if (lessonSnap.exists()) {
        setLesson(lessonSnap.data());
      }
      setLoading(false);
    };
    fetchLesson();
  }, [id]);

  useEffect(() => {
    // Fetch all nuggets referenced in sections
    if (lesson && Array.isArray(lesson.sections)) {
      const db = getFirestore();
      const allContentIds = lesson.sections.flatMap(sec => sec.contentIds || []);
      if (allContentIds.length === 0) return;
      Promise.all(
        allContentIds.map(id =>
          getDoc(doc(db, "content", id)).then(snap =>
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

  if (loading) return <div>Loading...</div>;
  if (!lesson) return <div>Lesson not found.</div>;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: 32 }}>
      <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16 }}>
        {lesson.title || lesson.Title || "Untitled Lesson"}
      </h2>

      {/* Description AFTER title */}
      {lesson.description && typeof lesson.description === "string" && (
        <div style={{ marginBottom: 16 }}>
          <strong>Description:</strong>
          <div
            className="rich-text-content"
            dangerouslySetInnerHTML={{ __html: lesson.description }}
          />
        </div>
      )}

      {/* Objectives */}
      {Array.isArray(lesson.objectives) && lesson.objectives.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Objectives:</strong>
          {lesson.objectives.map((obj, idx) => (
            <div
              key={idx}
              className="rich-text-content"
              dangerouslySetInnerHTML={{ __html: obj }}
              style={{ marginBottom: 8 }}
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
          let dateObj = value;
          if (typeof value === "object" && value.seconds) {
            dateObj = new Date(value.seconds * 1000);
          } else {
            dateObj = new Date(value);
          }
          const formatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <strong>Created At:</strong> {formatted}
            </div>
          );
        }

        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </div>
        );
      })}

      {/* Duration LAST */}
      {lesson.duration && (
        <div style={{ marginBottom: 16 }}>
          <strong>Duration:</strong> {lesson.duration} minutes
        </div>
      )}

      {/* Sections AT THE BOTTOM */}
      {Array.isArray(lesson.sections) && lesson.sections.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 32 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Sections:</h3>
          {lesson.sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 24,
                padding: "18px 18px 12px 18px",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                background: "#f9fafb",
                boxShadow: "0 2px 8px rgba(22,32,64,0.04)"
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 8 }}>
                {section.title || section.name || `Section ${idx + 1}`}
              </div>
              {section.intro && (
                <div
                  className="rich-text-content"
                  dangerouslySetInnerHTML={{ __html: section.intro }}
                />
              )}
              {Array.isArray(section.contentIds) && section.contentIds.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                  {section.contentIds.map(contentId => {
                    const nugget = nuggets[contentId];
                    return (
                      <div
                        key={contentId}
                        style={{
                          background: "#f6f8fa",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          minWidth: "180px",
                          maxWidth: "260px",
                          marginBottom: "8px",
                          boxShadow: "0 2px 8px rgba(22,32,64,0.06)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start"
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "1.08rem", marginBottom: 6 }}>
                          {nugget ? (
                            <a
                              href={`/view-content/${contentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#1a73e8",
                                textDecoration: "underline",
                                cursor: "pointer"
                              }}
                              title="View Nugget Details"
                            >
                              {nugget.title || nugget.Title || "Untitled Nugget"}
                            </a>
                          ) : (
                            "Nugget not found"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#888", fontStyle: "italic" }}>No nuggets in this section.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonDetailsPage;