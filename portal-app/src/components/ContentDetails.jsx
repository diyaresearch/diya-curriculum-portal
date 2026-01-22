import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

const ContentDetails = () => {
  const { id } = useParams(); // must be called unconditionally

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

      <h1 style={{ marginBottom: 10 }}>{content.Title}</h1>

      {/* Metadata */}
      <div style={{ marginBottom: 18, color: "#333", lineHeight: 2.6 }}>
        <div><strong>Author:</strong> {content.Author || "—"}</div>
        <div><strong>Category:</strong> {(content.Category || []).join(", ") || "—"}</div>
        <div><strong>Level:</strong> {(content.Level || []).join(", ") || "—"}</div>
        <div><strong>Type:</strong> {(content.Type || []).join(", ") || "—"}</div>
        <div><strong>Duration:</strong> {content.Duration || "—"} minutes</div>
      </div>

      {/* Description */}
      <h3 style={{ marginTop: 18, lineHeight: 1.5 }}><strong>Description</strong> </h3>
      <div
        dangerouslySetInnerHTML={{ __html: content.Description || "" }}
      />

      {/* Instructions */}
      <h3 style={{ marginTop: 18, lineHeight: 1.5 }}><strong>Instructions / Notes</strong> </h3>
      <div
        dangerouslySetInnerHTML={{ __html: content.Instructions || "" }}
      />

      {/* Attachments 
      <h3 style={{ marginTop: 18 }}>Attachments</h3> */}
      <h3 style={{ marginTop: 18 }}> </h3> 
      {attachments.length === 0 ? (
        <div style={{ color: "#666" }}>No links attached.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {attachments.map((a) => {
            const title = a.title || (a.linkType === "slides" ? "Google Slides" : "Link");
            const url = a.url || "";
            const slidesEmbed = a.linkType === "slides" ? toSlidesEmbedUrl(url) : null;
            
            return (
                <div
                  key={a.id || url}
                  
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
            
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
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Open link
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
