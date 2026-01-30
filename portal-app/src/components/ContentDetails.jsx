import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import BackButton from "./BackButton";

const toSlidesEmbedUrl = (url) => {
  // Example input: https://docs.google.com/presentation/d/<ID>/edit#slide=id....
  // Embed form:    https://docs.google.com/presentation/d/<ID>/embed?start=false&loop=false&delayms=3000
  try {
    const u = new URL(url);
    if (!u.hostname.includes("docs.google.com")) return null;
    if (!u.pathname.includes("/presentation/")) return null;

    // Convert .../edit... to .../embed...
    const path = u.pathname.replace("/edit", "/embed");
    return `${u.origin}${path}?start=false&loop=false&delayms=3000`;
  } catch {
    return null;
  }
};

const ContentDetails = () => {
  const { id } = useParams(); // must be called unconditionally
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing id in URL.");
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        const db = getFirestore(firebaseApp);
        const snap = await getDoc(doc(db, "content", id));

        if (snap.exists()) {
          setContent({ id: snap.id, ...snap.data() });
        } else {
          setError("Content not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load content.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  const attachments = useMemo(() => {
    // You saved this field as "attachmentsToSave"
    const arr = content?.attachmentsToSave;
    return Array.isArray(arr) ? arr : [];
  }, [content]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: "crimson" }}>{error}</div>;
  if (!content) return <div style={{ padding: 40 }}>Content not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Button */}
      <BackButton onClick={() => navigate(-1)} className="mb-4" />

      <h1 className="text-3xl font-bold text-gray-900" style={{ marginBottom: 8 }}>
        {content.Title}
      </h1>

      {/* Metadata row (match Lesson Plan header style) */}
      <div
        style={{
          marginTop: "16px",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Author:</span>
            <span className="ml-2 text-gray-800">{content.Author || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Type:</span>
            <span className="ml-2 text-gray-800">
              {Array.isArray(content.Type) ? content.Type.join(", ") : content.Type || "—"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Category:</span>
            <span className="ml-2 text-gray-800">
              {Array.isArray(content.Category) ? content.Category.join(", ") : content.Category || "—"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Level:</span>
            <span className="ml-2 text-gray-800">
              {Array.isArray(content.Level) ? content.Level.join(", ") : content.Level || "—"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Duration:</span>
            <span className="ml-2 text-gray-800">{content.Duration || "—"} minutes</span>
          </div>
        </div>
      </div>

      {/* Description (match lesson page typography) */}
      <div className="py-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Description</h2>
        <div
          className="rich-text-content text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.Description || "" }}
        />
      </div>

      {/* Instructions (match lesson page typography) */}
      <div className="py-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Instructions / Notes</h2>
        <div
          className="rich-text-content text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.Instructions || "" }}
        />
      </div>

      {/* Attachments */}
      {attachments.length === 0 ? (
        <div style={{ color: "#666", fontStyle: "italic", marginTop: "18px" }}>
          No links attached.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "18px" }}>
          {attachments.map((a) => {
            const title = a.title || (a.linkType === "slides" ? "Google Slides" : "Link");
            const url = a.url || "";
            const slidesEmbed = a.linkType === "slides" ? toSlidesEmbedUrl(url) : null;
            
            return (
              <div
                key={a.id || url}
                style={{
                  backgroundColor: "#fafafa",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "20px",
                }}
              >
                {/* Enhanced Title */}
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {title}
                </div>
            
                {/* Content */}
                {slidesEmbed ? (
                  <iframe
                    title={title}
                    src={slidesEmbed}
                    width="100%"
                    height="480"
                    style={{ border: 0, borderRadius: 8 }}
                    allowFullScreen
                  />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "12px 16px",
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      color: "#1a73e8",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.borderColor = "#1a73e8";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#fff";
                      e.target.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Open link →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default ContentDetails;
