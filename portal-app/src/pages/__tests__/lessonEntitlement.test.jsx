/**
 * The lesson page refuses paid content it has no entitlement for (#430).
 *
 * `/lesson-details/:id` used to read the document straight out of Firestore
 * with the id from the URL, so a link to a lesson inside a module nobody had
 * paid for rendered it in full. It reads through the API now, which runs the
 * entitlement check - these assert the refusal is both honoured and explained,
 * rather than being shown as the generic "not found" that would send a paying
 * customer hunting for a broken link.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { api, ApiError } from "@/utils/apiClient";

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock("@/firebase/firebaseConfig", () => ({ app: {}, db: {} }));

vi.mock("@/utils/apiClient", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

async function renderPage() {
  const { default: LessonDetailsPage } = await import(
    "@/pages/lesson-details/LessonDetailsPage"
  );
  const view = render(
    <MemoryRouter initialEntries={["/lesson-details/paid-lesson"]}>
      <Routes>
        <Route path="/lesson-details/:id" element={<LessonDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
  await waitFor(() =>
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument()
  );
  return view;
}

beforeEach(() => {
  api.get.mockReset();
});

describe("#430 — a lesson inside an unpurchased module", () => {
  test("a 403 explains the lesson is paid for, and renders none of it", async () => {
    api.get.mockRejectedValueOnce(
      new ApiError("This lesson is part of a module you have not purchased", {
        status: 403,
        code: "AUTHORIZATION_ERROR",
      })
    );

    const { container } = await renderPage();

    expect(screen.getByText(/part of a paid module/i)).toBeInTheDocument();
    expect(screen.getByText(/purchase the module/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/not found/i);
  });

  test("a 401 asks the visitor to sign in instead of to buy", async () => {
    api.get.mockRejectedValueOnce(
      new ApiError("Sign in to view this lesson", {
        status: 401,
        code: "AUTH_ERROR",
      })
    );

    await renderPage();

    expect(screen.getByText(/sign in with the account/i)).toBeInTheDocument();
  });

  test("a genuine 404 still reads as not found, not as a paywall", async () => {
    api.get.mockRejectedValueOnce(
      new ApiError("Lesson not found", { status: 404, code: "NOT_FOUND" })
    );

    await renderPage();

    expect(screen.queryByText(/part of a paid module/i)).not.toBeInTheDocument();
  });

  test("an entitled reader gets the lesson", async () => {
    api.get.mockResolvedValueOnce({
      id: "paid-lesson",
      title: "Inside the paid module",
      objectives: [],
      sections: [],
    });

    await renderPage();

    expect(screen.getByText("Inside the paid module")).toBeInTheDocument();
    expect(screen.queryByText(/part of a paid module/i)).not.toBeInTheDocument();
  });
});
