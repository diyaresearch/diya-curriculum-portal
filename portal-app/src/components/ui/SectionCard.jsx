import React from "react";

const SectionCard = ({ title, children, style, titleStyle }) => {
  return (
    // `style` stays a prop: callers pass runtime overrides (a computed
    // width, a conditional background), which is the one job inline style
    // keeps after #360. The card's own appearance is in the class list.
    <div
      className="mt-[22px] rounded-[14px] border border-rule bg-surface px-6 py-[22px]"
      style={style}
    >
      {title ? (
        <div
          className="mb-2.5 font-sans text-section-title font-bold leading-tight text-ink"
          style={titleStyle}
        >
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
};

export default SectionCard;

