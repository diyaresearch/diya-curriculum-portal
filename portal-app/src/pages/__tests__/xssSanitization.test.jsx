/**
 * Stored-XSS regression coverage (issue #381).
 *
 * ReactQuill-authored content (Description/Instructions/objectives/section
 * intros) is rendered via dangerouslySetInnerHTML. Four live-routed pages
 * rendered it raw, with no sanitization - an attacker who could write a
 * content/lesson document (any signed-in user, per #419) could run script
 * in every other viewer's browser. Fixed by wrapping every such render in
 * DOMPurify.sanitize(), matching the pattern already used by this repo's
 * other rich-text render sites (Overlay.jsx, lesson_detail/index.jsx,
 * module_detail/index.jsx). These tests feed a real payload through each
 * fixed component and assert it never reaches the DOM as executable markup.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { getDoc } from "firebase/firestore";

const XSS_PAYLOAD = '<img src=x onerror="window.__xss=true">safe text<script>window.__xss=true</script>';

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock("../../firebase/firebaseConfig", () => ({ app: {}, db: {} }));

// The factory's return value is the module namespace, so the hook has to be
// handed back as `default` rather than as the factory's bare return.
vi.mock("../../hooks/useUserData", () => ({
  default: () => ({
    user: null,
    userData: null,
    loading: false,
  }),
}));

function mockDocData(data) {
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    id: "test-id",
    data: () => data,
  });
}

function assertRenderedSafely(container) {
  // No live <script> or onerror-bearing element should have made it into
  // the DOM - that's the actual exploit, not just a substring match on the
  // sanitized HTML (DOMPurify may retain the text "onerror" as a harmless
  // string while stripping the attribute itself). Asserting an element's
  // *absence* from the DOM structure is exactly what querySelector is for;
  // it isn't a "query like a user" case Testing Library's own API covers.
  // eslint-disable-next-line testing-library/no-node-access
  expect(container.querySelector("script")).toBeNull();
  // eslint-disable-next-line testing-library/no-node-access
  expect(container.querySelector("[onerror]")).toBeNull();
  // The payload's harmless text content survives sanitization - some
  // components render it more than once (e.g. description + objective +
  // section intro, all fed the same fixture payload here).
  expect(screen.getAllByText(/safe text/).length).toBeGreaterThan(0);
}

describe("#381 — dangerouslySetInnerHTML sinks sanitize before rendering", () => {
  test("components/ContentDetails.jsx", async () => {
    const { default: ContentDetails } = await import("../../components/ContentDetails");
    mockDocData({
      Title: "t",
      Description: XSS_PAYLOAD,
      Instructions: XSS_PAYLOAD,
      Category: "c",
      Level: "l",
      Type: "type",
      Duration: "1h",
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/content/test-id"]}>
        <Routes>
          <Route path="/content/:id" element={<ContentDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    assertRenderedSafely(container);
  });

  test("pages/nugget-details.jsx", async () => {
    const { default: NuggetDetails } = await import("../nugget-details");
    mockDocData({
      Title: "t",
      Description: XSS_PAYLOAD,
      Instructions: XSS_PAYLOAD,
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/nugget-details/test-id"]}>
        <Routes>
          <Route path="/nugget-details/:id" element={<NuggetDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    assertRenderedSafely(container);
  });

  test("pages/lesson-details/LessonDetailsPage.jsx", async () => {
    const { default: LessonDetailsPage } = await import("../lesson-details/LessonDetailsPage");
    mockDocData({
      title: "t",
      description: XSS_PAYLOAD,
      objectives: [XSS_PAYLOAD],
      sections: [{ title: "s1", intro: XSS_PAYLOAD }],
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/lesson-details/test-id"]}>
        <Routes>
          <Route path="/lesson-details/:id" element={<LessonDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    assertRenderedSafely(container);
  });
});
