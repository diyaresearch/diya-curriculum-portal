import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Helper to extract text and links from HTML
function renderTextWithLinks(html) {
  if (!html) return "";
  // Match all <a ...>...</a>
  const linkRegex = /<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Remove all tags except <a>
  html = html.replace(/<(?!a\s|\/a)[^>]+>/gi, "");

  while ((match = linkRegex.exec(html)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      parts.push(html.substring(lastIndex, match.index));
    }
    // The link itself
    parts.push(
      <a
        key={key++}
        href={match[1]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#1a73e8", textDecoration: "underline", wordBreak: "break-all" }}
      >
        {match[2]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  // Any text after the last link
  if (lastIndex < html.length) {
    parts.push(html.substring(lastIndex));
  }
  return parts;
}

const NuggetDetails = () => {
  const { id } = useParams();
  const [nugget, setNugget] = useState(null);

  useEffect(() => {
    const fetchNugget = async () => {
      const db = getFirestore();
      const docRef = doc(db, "content", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setNugget({ id: docSnap.id, ...docSnap.data() });
      }
    };
    fetchNugget();
  }, [id]);

  if (!nugget) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Open Sans, sans-serif" }}>
      <h1 style={{ fontWeight: 700, fontSize: "2.4rem", color: "#111C44", marginBottom: 10 }}>
        {nugget.Title}
      </h1>
      <p style={{ fontSize: "1.18rem", color: "#444", marginBottom: 16 }}>
        {renderTextWithLinks(nugget.Description)}
      </p>
      <div style={{ fontSize: "1rem", color: "#222", marginBottom: 8 }}>
        <strong>Author:</strong> {nugget.Author}
      </div>
      <div style={{ fontSize: "1rem", color: "#222", marginBottom: 8 }}>
        <strong>Created:</strong>{" "}
        {nugget.createdAt
          ? typeof nugget.createdAt.toDate === "function"
            ? nugget.createdAt.toDate().toLocaleDateString()
            : !isNaN(Date.parse(nugget.createdAt))
            ? new Date(nugget.createdAt).toLocaleDateString()
            : ""
          : ""}
      </div>
      <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>Category</div>
          <div style={{ fontSize: "1.08rem", color: "#444" }}>
            {Array.isArray(nugget.Category)
              ? nugget.Category.join(", ")
              : nugget.Category}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>Level</div>
          <div style={{ fontSize: "1.08rem", color: "#444" }}>
            {Array.isArray(nugget.Level)
              ? nugget.Level.join(", ")
              : nugget.Level}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>Duration</div>
          <div style={{ fontSize: "1.08rem", color: "#444" }}>{nugget.Duration}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>Type</div>
          <div style={{ fontSize: "1.08rem", color: "#444" }}>
            {Array.isArray(nugget.Type)
              ? nugget.Type.join(", ")
              : nugget.Type}
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>Instructions</div>
        <div style={{ fontSize: "1.08rem", color: "#444" }}>
          {renderTextWithLinks(nugget.Instructions)}
        </div>
      </div>
    </div>
  );
};

export default NuggetDetails;
