import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import BackButton from "./BackButton";
import MetaChipsRow from "./MetaChipsRow";
import { TYPO } from "../constants/typography";
import SectionCard from "./SectionCard";

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
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Back control (match module page spacing) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 20px 0 20px" }}>
        <BackButton onClick={() => navigate(-1)} />
      </div>

      {/* Header (match module page) */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 20px 0 20px",
          textAlign: "center",
        }}
      >
        <h1 style={TYPO.pageTitle}>{content.Title}</h1>
        <MetaChipsRow
          style={{ marginTop: 18 }}
          items={[
            { label: "Author", value: content.Author || "—" },
            { label: "Category", value: content.Category },
            { label: "Level", value: content.Level },
            { label: "Type", value: content.Type },
            {
              label: "Duration",
              value: content.Duration !== undefined && content.Duration !== null ? `${content.Duration} min` : "—",
            },
          ]}
        />
      </div>

      {/* Main content cards */}
      <div style={{ maxWidth: 1100, margin: "28px auto 0 auto", padding: "0 20px 80px 20px" }}>
        <SectionCard title="Description" style={{ marginTop: 0 }}>
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: content.Description || "" }}
          />
        </SectionCard>

        <SectionCard title="Instructions / Notes">
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: content.Instructions || "" }}
          />
        </SectionCard>

        <SectionCard title="Attachments">
          {attachments.length === 0 ? (
            <div style={{ ...TYPO.body, color: "#666", fontStyle: "italic" }}>No links attached.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        </SectionCard>
      </div>
    </div>
  );
};

export default ContentDetails;
