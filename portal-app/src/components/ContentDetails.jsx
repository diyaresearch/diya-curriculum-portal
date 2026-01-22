import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";

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

const Badge = ({ children }) => (
  <span
    style={{
      display: "inline-block",
      backgroundColor: "#f0f0f0",
      color: "#333",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "0.875rem",
      marginRight: "6px",
      marginBottom: "4px",
    }}
  >
    {children}
  </span>
);

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
    <div style={{ 
        padding: 40, maxWidth: 900, margin: "0 auto",  
        }}>
      
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.95rem",
          fontWeight: 500,
          color: "#333",
          marginBottom: "16px",
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
        ← Back
      </button>

      <h1 style={{ marginBottom: 8 }}>{content.Title}</h1>

      {/* Metadata in two-column format */}
      <div
        style={{
          backgroundColor: "#fafafa",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "20px",
          marginTop: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{
            gap: "16px",
          }}
        >
          {/* Left Column */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 12px",
                color: "#333",
                lineHeight: "1.6",
                fontSize: "0.95rem",
              }}
            >
              <div><strong>Author:</strong></div>
              <div>{content.Author || "—"}</div>

              <div><strong>Category:</strong></div>
              <div>
                {Array.isArray(content.Category) && content.Category.length > 0 ? (
                  content.Category.map((cat, idx) => (
                    <Badge key={idx}>{cat}</Badge>
                  ))
                ) : (
                  "—"
                )}
              </div>

              <div><strong>Level:</strong></div>
              <div>
                {Array.isArray(content.Level) && content.Level.length > 0 ? (
                  content.Level.map((level, idx) => (
                    <Badge key={idx}>{level}</Badge>
                  ))
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 12px",
                color: "#333",
                lineHeight: "1.6",
                fontSize: "0.95rem",
              }}
            >
              <div><strong>Type:</strong></div>
              <div>
                {Array.isArray(content.Type) && content.Type.length > 0 ? (
                  content.Type.map((type, idx) => (
                    <Badge key={idx}>{type}</Badge>
                  ))
                ) : (
                  "—"
                )}
              </div>

              <div><strong>Duration:</strong></div>
              <div>{content.Duration || "—"} minutes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Description and Instructions in grey box */}
      <div
        style={{
          backgroundColor: "#fafafa",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "20px",
          marginTop: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Description */}
        <h3 style={{ marginBottom: "8px", lineHeight: "1.5", fontSize: "1.1rem" }}>
          <strong>Description</strong>
        </h3>
        <div
          style={{ lineHeight: "1.6", marginBottom: "16px" }}
          dangerouslySetInnerHTML={{ __html: content.Description || "" }}
        />

        {/* Instructions */}
        <h3 style={{ marginTop: "16px", marginBottom: "8px", lineHeight: "1.5", fontSize: "1.1rem" }}>
          <strong>Instructions / Notes</strong>
        </h3>
        <div
          style={{ lineHeight: "1.6" }}
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
  );
};

export default ContentDetails;
