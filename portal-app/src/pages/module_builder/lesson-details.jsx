import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

  // Custom styles for lists, links, and headings
  const customStyles = `
    .nugget-rich-html ul, .nugget-rich-html ol {
      margin-left: 1.5em;
      padding-left: 1.2em;
    }
    .nugget-rich-html ul {
      list-style-type: disc;
    }
    .nugget-rich-html ol {
      list-style-type: decimal;
    }
    .nugget-rich-html li {
      margin-bottom: 0.3em;
    }
    .nugget-rich-html a {
      color: #1a73e8;
      text-decoration: underline;
      word-break: break-all;
    }
    .nugget-rich-html h1 {
      font-size: 2.2rem;
      color: #111C44;
      font-weight: 700;
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      line-height: 1.2;
    }
    .nugget-rich-html h2 {
      font-size: 1.7rem;
      color: #111C44;
      font-weight: 700;
      margin-top: 1.1em;
      margin-bottom: 0.5em;
      line-height: 1.2;
    }
    .nugget-rich-html h3 {
      font-size: 1.3rem;
      color: #111C44;
      font-weight: 700;
      margin-top: 1em;
      margin-bottom: 0.4em;
      line-height: 1.2;
    }
    .nugget-rich-html h4, 
    .nugget-rich-html h5, 
    .nugget-rich-html h6 {
      font-size: 1.08rem;
      color: #111C44;
      font-weight: 700;
      margin-top: 0.8em;
      margin-bottom: 0.3em;
      line-height: 1.2;
    }
  `;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Open Sans, sans-serif" }}>
      <style>{customStyles}</style>
      <h1 style={{ fontWeight: 700, fontSize: "2.4rem", color: "#111C44", marginBottom: 10 }}>
        {nugget.Title}
      </h1>
      <div
        className="nugget-rich-html"
        style={{ color: "#444", marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: nugget.Description || "" }}
      />
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
        <div
          className="nugget-rich-html"
          style={{ color: "#444" }}
          dangerouslySetInnerHTML={{ __html: nugget.Instructions || "" }}
        />
      </div>
    </div>
  );
};

export default NuggetDetails;
