import React from "react";
import { TYPO } from "../constants/typography";

const mk = (Tag, baseStyle) =>
  function Typo({ style, className = "", ...props }) {
    return <Tag {...props} className={className} style={{ ...baseStyle, ...style }} />;
  };

export const PageTitle = mk("h1", TYPO.pageTitle);
export const PageSubtitle = mk("p", TYPO.pageSubtitle);
export const SectionTitle = mk("h2", TYPO.sectionTitle);
export const BodyText = mk("p", TYPO.body);
export const MetaText = mk("span", TYPO.meta);
export const FieldLabel = mk("label", TYPO.fieldLabel);
export const HelperText = mk("div", TYPO.fieldHelper);

