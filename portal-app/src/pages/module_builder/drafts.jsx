import React from "react";
import DraftsPage from "@/pages/drafts/DraftsPage";
import { COLLECTIONS } from "@/firebase/collectionNames";

const ModuleDrafts = () => (
  <DraftsPage
    collectionName={COLLECTIONS.module}
    draftStorageKey="moduleDraft"
    builderPath="/module-builder"
    heading="Module Drafts"
    subheading="Continue editing your saved module drafts below."
    untitledLabel="Untitled Module"
    createLabel="+ Create New Module"
  />
);

export default ModuleDrafts;
