import React, { useLayoutEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import OverlayTileView from "@/components/content/OverlayTileView";

const nugget = (id, Title, Category, Type, Level) => ({
  id,
  Title,
  Category,
  Type,
  Level,
  Description: `${Title} description`,
});

const CONTENT = [
  nugget("1", "Arrays in Java", "Data Science", "Lecture", "Basic"),
  nugget("2", "Neural nets", "Machine Learning", "Lecture", "Advanced"),
  nugget("3", "Sampling", "Statistics", "Assignment", "Intermediate"),
];

function renderOverlay(props = {}) {
  return render(
    <MemoryRouter>
      <OverlayTileView
        content={CONTENT}
        onClose={vi.fn()}
        onSelectMaterial={vi.fn()}
        initialSelectedTiles={[]}
        contentType="nugget"
        {...props}
      />
    </MemoryRouter>
  );
}

const titles = () => CONTENT.map((c) => c.Title).filter((t) => screen.queryByText(t));

/**
 * Records the tiles present in the DOM after *every* commit, not just the last
 * one. Testing Library flushes effects before it hands control back, so an
 * intermediate frame is invisible to `screen` queries - and an intermediate
 * frame is exactly what the two-effect version produced.
 */
function CommitProbe({ onCommit }) {
  useLayoutEffect(() => {
    onCommit(screen.queryAllByTestId("tile-title").map((el) => el.textContent));
  });
  return null;
}

describe("OverlayTileView", () => {
  test("shows everything when no filter is set", () => {
    renderOverlay();

    expect(titles()).toEqual(["Arrays in Java", "Neural nets", "Sampling"]);
  });

  test("applies a filter passed as a prop on the very first render", () => {
    // The filtered list is derived during render (#525). It used to start as
    // the unfiltered `content` and be corrected by an effect afterwards.
    renderOverlay({ category: "Statistics" });

    expect(titles()).toEqual(["Sampling"]);
  });

  test("never shows unfiltered content when the list is refetched mid-filter", () => {
    const commits = [];
    const tree = (content) => (
      <MemoryRouter>
        <OverlayTileView
          content={content}
          onClose={vi.fn()}
          onSelectMaterial={vi.fn()}
          initialSelectedTiles={[]}
          contentType="nugget"
          category="Statistics"
        />
        <CommitProbe onCommit={(t) => commits.push(t)} />
      </MemoryRouter>
    );

    const { rerender } = render(tree(CONTENT));
    const refetched = [...CONTENT, nugget("4", "Bayes", "Statistics", "Lecture", "Basic")];
    rerender(tree(refetched));

    // The bug (#525): one effect wrote the unfiltered `content` and a second
    // wrote the filtered result, so a refetch during an active filter painted
    // every item for a frame. No commit may contain a non-matching item.
    expect(commits.length).toBeGreaterThan(0);
    for (const frame of commits) {
      expect(frame).not.toContain("Neural nets");
      expect(frame).not.toContain("Arrays in Java");
    }

    expect(screen.getByText("Sampling")).toBeInTheDocument();
    expect(screen.getByText("Bayes")).toBeInTheDocument();
  });

  test("filters by search term", async () => {
    const user = userEvent.setup();
    renderOverlay();

    await user.type(screen.getByPlaceholderText("Search for ..."), "neural");

    expect(titles()).toEqual(["Neural nets"]);
  });

  test("re-seeds the dropdowns when the parent hands down a different filter", () => {
    const { rerender } = renderOverlay({ category: "Statistics" });
    expect(titles()).toEqual(["Sampling"]);

    rerender(
      <MemoryRouter>
        <OverlayTileView
          content={CONTENT}
          onClose={vi.fn()}
          onSelectMaterial={vi.fn()}
          initialSelectedTiles={[]}
          contentType="nugget"
          category="Machine Learning"
        />
      </MemoryRouter>
    );

    expect(titles()).toEqual(["Neural nets"]);
  });
});
