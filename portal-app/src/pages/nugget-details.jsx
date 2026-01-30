import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { TYPO } from "../constants/typography";
import MetaChipsRow from "../components/MetaChipsRow";
import SectionCard from "../components/SectionCard";
import BackButton from "../components/BackButton";

const NuggetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nugget, setNugget] = useState(null);
  const [error, setError] = useState("");


  useEffect(() => {
    const fetchNugget = async () => {
      try {
        setError("");
        const db = getFirestore();
        const docRef = doc(db, "content", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError(`No nugget found for id: ${id}`);
          setNugget(null);
          return;
        }

        setNugget({ id: docSnap.id, ...docSnap.data() });
      } catch (e) {
        console.error("NuggetDetails fetch error:", e);
        setError(e?.message || "Failed to load nugget.");
      }
    };

    fetchNugget();
  }, [id]);
  if (error) {
    return <div style={{ padding: 24, color: "crimson" }}>{error}</div>;
  }

  if (!nugget) return <div style={{ padding: 24 }}>Loading...</div>;
  
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
      font-size: var(--text-rich-h1);
      color: #111C44;
      font-weight: 700;
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      line-height: 1.2;
    }
    .nugget-rich-html h2 {
      font-size: var(--text-rich-h2);
      color: #111C44;
      font-weight: 700;
      margin-top: 1.1em;
      margin-bottom: 0.5em;
      line-height: 1.2;
    }
    .nugget-rich-html h3 {
      font-size: var(--text-rich-h3);
      color: #111C44;
      font-weight: 700;
      margin-top: 1em;
      margin-bottom: 0.4em;
      line-height: 1.2;
    }
    .nugget-rich-html h4, 
    .nugget-rich-html h5, 
    .nugget-rich-html h6 {
      font-size: var(--text-label);
      color: #111C44;
      font-weight: 700;
      margin-top: 0.8em;
      margin-bottom: 0.3em;
      line-height: 1.2;
    }
  `;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Back control (match module page spacing) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 20px 0 20px" }}>
        <BackButton
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate("/");
          }}
        />
      </div>

      <style>{customStyles}</style>

      {/* Header (match module page) */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 20px 0 20px",
          textAlign: "center",
        }}
      >
        <h1 style={{ ...TYPO.pageTitle, color: "#111" }}>{nugget.Title}</h1>

        <div style={{ maxWidth: 820, margin: "10px auto 0 auto", textAlign: "left" }}>
          <div
            className="nugget-rich-html"
            style={{ ...TYPO.pageSubtitle, color: "#222" }}
            dangerouslySetInnerHTML={{ __html: nugget.Description || "" }}
          />
        </div>

        <MetaChipsRow
          style={{ marginTop: 18 }}
          items={[
            { label: "Author", value: nugget.Author || "—" },
            { label: "Category", value: nugget.Category },
            { label: "Level", value: nugget.Level },
            { label: "Type", value: nugget.Type },
            { label: "Duration", value: nugget.Duration },
          ]}
        />
      </div>

      {/* Main content cards */}
      <div style={{ maxWidth: 1100, margin: "28px auto 0 auto", padding: "0 20px 80px 20px" }}>

      {Array.isArray(nugget.attachments) && nugget.attachments.length > 0 && (
        <SectionCard title="Attachments">
          <ul style={{ marginLeft: 18, color: "#444" }}>
            {nugget.attachments
              .filter((a) => a && a.kind === "link" && a.url)
              .map((a, idx) => {
                const label =
                  a.title?.trim()
                    ? a.title
                    : a.linkType === "slides"
                      ? "Google Slides"
                      : a.linkType === "colab"
                        ? "Google Colab Notebook"
                        : "Link";

                return (
                  <li key={a.id || idx} style={{ marginBottom: 8 }}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1a73e8", textDecoration: "underline" }}
                    >
                      {label}
                    </a>
                  </li>
                );
              })}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Instructions">
        <div
          className="nugget-rich-html"
          style={{ ...TYPO.body, color: "#444" }}
          dangerouslySetInnerHTML={{ __html: nugget.Instructions || "" }}
        />
      </SectionCard>
      </div>
    </div>
  );
};

export default NuggetDetails;
