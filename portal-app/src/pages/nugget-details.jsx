import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import DOMPurify from "dompurify";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { TYPO } from "@/constants/typography";
import MetaChipsRow from "@/components/ui/MetaChipsRow";
import SectionCard from "@/components/ui/SectionCard";
import BackButton from "@/components/ui/BackButton";
import Loading from "@/components/ui/Loading";

const NuggetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nugget, setNugget] = useState(null);
  const [error, setError] = useState("");


  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const fetchNugget = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.content, id);
        const docSnap = await getDoc(docRef);
        if (cancelled) return;

        if (!docSnap.exists()) {
          setError(`No nugget found for id: ${id}`);
          setNugget(null);
          return;
        }

        setNugget({ id: docSnap.id, ...docSnap.data() });
      } catch (e) {
        console.error("NuggetDetails fetch error:", e);
        setError(e?.message || "Failed to load nugget.");
      } finally {
        setLoading(false);
      }
    };

    fetchNugget();

    return () => {
      cancelled = true;
    };
  }, [id]);
  // `loading` rather than `!nugget`: those are different states, and
  // conflating them showed a permanent "Loading..." for a nugget that simply
  // does not exist (#369).
  if (loading) return <Loading variant="page" message="Loading nugget..." />;

  if (error) {
    return <div className="p-6 [color:crimson]">{error}</div>;
  }

  if (!nugget) return <div className="p-6">This nugget is no longer available.</div>;
  
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
    <div className="bg-surface min-h-screen">
      {/* Back control (match module page spacing) */}
      <div className="max-w-275 my-0 mx-auto pt-4.5 pr-5 pb-0 pl-5">
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
        className="max-w-275 my-0 mx-auto pt-2.5 pr-5 pb-0 pl-5 text-center"
      >
        <h1 style={{ ...TYPO.pageTitle, color: "#111" }}>{nugget.Title}</h1>

        <div className="max-w-205 mt-2.5 mr-auto mb-0 ml-auto text-left">
          <div
            className="nugget-rich-html"
            style={{ ...TYPO.pageSubtitle, color: "#222" }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(nugget.Description || "") }}
          />
        </div>

        <MetaChipsRow
          className="mt-4.5"
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
      <div className="max-w-275 mt-7 mr-auto mb-0 ml-auto pt-0 pr-5 pb-20 pl-5">

      {Array.isArray(nugget.attachments) && nugget.attachments.length > 0 && (
        <SectionCard title="Attachments">
          <ul className="ml-4.5 text-[#444]">
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
                  <li key={a.id || idx} className="mb-2">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link underline"
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
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(nugget.Instructions || "") }}
        />
      </SectionCard>
      </div>
    </div>
  );
};

export default NuggetDetails;
