import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import DOMPurify from "dompurify";
import { COLLECTIONS } from "@/firebase/collectionNames";
import Loading from "@/components/ui/Loading";
import { api, ApiError } from "@/utils/apiClient";
import { toUserMessage } from "@/utils/errorMessage";

const LessonDetailsPage = () => {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuggets, setNuggets] = useState({});

  // Read through the API, not straight out of Firestore (#430).
  //
  // This route is the "direct URL navigation to a paid module's lessons" the
  // issue describes: it took an id from the URL and read the document, so a
  // link to a lesson inside a module nobody had paid for rendered it in full.
  // Only the API can answer whether the caller is entitled - that needs a
  // query over the modules containing this lesson, which security rules cannot
  // express - so the fetch goes through it and a refusal is rendered as one.
  useEffect(() => {
    let cancelled = false;
    const fetchLesson = async () => {
      try {
        const data = await api.get(`/api/lesson/${id}`);
        if (cancelled) return;
        setLesson(data);
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  // 401/403 means the lesson exists but belongs to a module this visitor has
  // not bought - say so, rather than the "not found" that every other failure
  // gets, which would send a paying customer looking for a broken link.
  if (error instanceof ApiError && error.isAuthError) {
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", padding: 32, textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
          This lesson is part of a paid module
        </h2>
        <p style={{ marginBottom: 20 }}>
          {error.status === 401
            ? "Sign in with the account that purchased it to read this lesson."
            : "Purchase the module it belongs to to read this lesson."}
        </p>
        <Link to="/">Back to modules</Link>
      </div>
    );
  }

  if (error) return <div>{toUserMessage(error, "Could not load this lesson.")}</div>;
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
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.description) }}
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
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obj) }}
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
          let dateObj;
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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.intro) }}
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
                            <Link
                              to={`/view-content/${contentId}`}
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