import React from "react";
import UploadContent from "./upload-content"; // adjust path if needed
import { TYPO } from "@/constants/typography";

const NuggetBuilderPage = (props) => (
  <div
    className="min-h-screen bg-surface-subtle flex flex-col items-center pt-10 pb-16 relative"
  >
    {/* Only show X button if onCancel is provided (i.e. in popup/modal) */}
    {props.onCancel && (
      <button
        onClick={props.onCancel}
        className="fixed top-8 right-8 bg-none border-0 text-[2.2rem] text-ink-faint cursor-pointer z-[2000] font-bold leading-none shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
        aria-label="Close"
        type="button"
      >
        &times;
      </button>
    )}
    <div className="w-full max-w-275 my-0 mx-auto">
      <h1
        style={{
          ...TYPO.pageTitle,
          textAlign: "center",
          margin: 0,
        }}
      >
        Nugget Builder
      </h1>
      <p
        style={{
          marginTop: "12px",
          ...TYPO.pageSubtitle,
          color: "#222",
          textAlign: "center",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        Create and manage your nuggets of content easily.
      </p>
      <div
        className="flex flex-col items-center justify-center mt-10"
      >
        <div
          className="w-full max-w-150 bg-surface rounded-[18px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#e0dfdb] py-10 px-8 min-w-80"
        >
          <UploadContent
            title="Nugget Builder"
            fromLesson={props.onCancel}
            onNuggetCreated={props.onSave}
          />
        </div>
      </div>
    </div>
  </div>
);

export default NuggetBuilderPage;