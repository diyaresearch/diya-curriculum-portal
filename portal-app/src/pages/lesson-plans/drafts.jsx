import React from "react";
import DraftsPage from "@/pages/drafts/DraftsPage";
import { COLLECTIONS } from "@/firebase/collectionNames";

const LessonPlanDrafts = () => (
  <DraftsPage
    collectionName={COLLECTIONS.lesson}
    draftStorageKey="lessonPlanDraft"
    builderPath="/lesson-plans/builder"
    heading="Lesson Plan Drafts"
    subheading="Continue editing your saved lesson plan drafts below."
    untitledLabel="Untitled Lesson Plan"
    createLabel="+ Create New Lesson Plan"
  />
);

export default LessonPlanDrafts;
