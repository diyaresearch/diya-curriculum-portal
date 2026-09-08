/**
 * The carousel's moving parts (#411): navigation, auto-advance, and the
 * keyboard/screen-reader surface that the hand-rolled dots and overlay had
 * none of.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CAROUSEL_CONFIG } from "@/constants/testimonialData";

const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: (...args) => getDocs(...args),
}));

vi.mock("@/firebase/firebaseConfig", () => ({ db: {} }));

const role = { current: "teacherPlus" };
vi.mock("@/hooks/useUserRole", () => ({
  default: () => ({ user: { uid: "u1" }, role: role.current }),
}));

const TestimonialsSection = (await import("@/components/home/TestimonialsSection")).default;

const TESTIMONIALS = [
  { id: "t1", Name: "Ada", Role: "Teacher", institutionName: "Fern High", Text: "First testimonial." },
  { id: "t2", Name: "Grace", Role: "Teacher", institutionName: "Oak School", Text: "Second testimonial." },
  { id: "t3", Name: "Alan", Role: "Student", institutionName: "Elm College", Text: "Third testimonial." },
];

function snapshotOf(items) {
  return { forEach: (cb) => items.forEach((item) => cb({ id: item.id, data: () => item })) };
}

/** Renders and waits for the Firestore load to settle. */
async function mountSection() {
  render(<TestimonialsSection />);
  await screen.findByRole("group", { name: "Testimonials" });
}

/**
 * Flush the resolved getDocs promise while fake timers are installed.
 * findBy* cannot do it here: the tests that need this have deliberately
 * frozen the clock the queries would be waiting on.
 */
async function settleUnderFakeTimers() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  role.current = "teacherPlus";
  getDocs.mockReset();
  getDocs.mockResolvedValue(snapshotOf(TESTIMONIALS));
});

describe("TestimonialsSection visibility", () => {
  test("renders nothing when Firestore has no testimonials", async () => {
    getDocs.mockResolvedValue(snapshotOf([]));
    const { container } = render(<TestimonialsSection />);

    // #433: an empty carousel under a "Testimonials" heading still reads as a
    // claim, so the whole section goes away.
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Testimonials" })).not.toBeInTheDocument();
  });

  test("renders nothing for teacherDefault", async () => {
    role.current = "teacherDefault";
    const { container } = render(<TestimonialsSection />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  test("a Firestore failure hides the section instead of breaking the page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getDocs.mockRejectedValue(new Error("permission denied"));
    const { container } = render(<TestimonialsSection />);

    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    console.error.mockRestore();
  });
});

describe("TestimonialsCarousel navigation", () => {
  test("shows the first testimonial, teachers sorted ahead of students", async () => {
    await mountSection();

    expect(screen.getByText(/First testimonial/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 of 3" })).toBeInTheDocument();
  });

  test("Next advances and Previous wraps back around", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();

      fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
      expect(screen.getByText(/Second testimonial/)).toBeInTheDocument();

      // The transition lock rejects a second move until it clears.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.TRANSITION_DURATION + 1);
      });

      fireEvent.click(screen.getByRole("button", { name: "Previous testimonial" }));
      expect(screen.getByText(/First testimonial/)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.TRANSITION_DURATION + 1);
      });

      fireEvent.click(screen.getByRole("button", { name: "Previous testimonial" }));
      expect(screen.getByText(/Third testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("a dot jumps straight to its testimonial and reports which is current", async () => {
    const user = userEvent.setup();
    await mountSection();

    await user.click(screen.getByRole("button", { name: "Go to testimonial 3 of 3" }));

    expect(screen.getByText(/Third testimonial/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to testimonial 3 of 3" }))
      .toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Go to testimonial 1 of 3" }))
      .not.toHaveAttribute("aria-current");
  });

  test("the dots are real buttons, so a keyboard can reach them", async () => {
    await mountSection();

    // They were <div onClick> - not focusable, and announced as nothing.
    const dots = screen.getAllByRole("button", { name: /^Go to testimonial/ });
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => expect(dot.tagName).toBe("BUTTON"));
  });
});

describe("auto-advance", () => {
  test("moves on by itself after the configured interval", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();
      expect(screen.getByText(/First testimonial/)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL + 1);
      });

      expect(screen.getByText(/Second testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("keeps running after a manual navigation", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();

      // The regression this covers: the handlers cleared the interval and
      // nothing restarted it, so one arrow click stopped auto-advance for the
      // rest of the page's life.
      fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
      expect(screen.getByText(/Second testimonial/)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL + 1);
      });

      expect(screen.getByText(/Third testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("a manual navigation restarts the clock rather than inheriting it", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL - 500);
      });
      fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
      expect(screen.getByText(/Second testimonial/)).toBeInTheDocument();

      // The 500ms left on the old interval must not carry over and yank the
      // slide away from someone who just chose it.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(screen.getByText(/Second testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("pauses while the pointer is over the carousel", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();

      fireEvent.mouseEnter(screen.getByRole("group", { name: "Testimonials" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL * 2);
      });

      expect(screen.getByText(/First testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("pauses while focus is inside it, so a keyboard user can stop it too", async () => {
    vi.useFakeTimers();
    try {
      render(<TestimonialsSection />);
      await settleUnderFakeTimers();

      // WCAG 2.2.2 needs a mechanism to pause moving content; hover alone
      // leaves a keyboard user with none.
      fireEvent.focus(screen.getByRole("button", { name: "Next testimonial" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL * 2);
      });

      expect(screen.getByText(/First testimonial/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("the live region stays quiet while rotating and speaks once paused", async () => {
    await mountSection();
    // The live region wraps the slide and carries no role of its own, so the
    // slide is the only handle on it. Same reasoning as ToastProvider's test.
    // eslint-disable-next-line testing-library/no-node-access
    const slides = screen.getByRole("group", { name: "1 of 3" }).parentElement;

    expect(slides).toHaveAttribute("aria-live", "off");

    fireEvent.mouseEnter(screen.getByRole("group", { name: "Testimonials" }));
    await waitFor(() => expect(slides).toHaveAttribute("aria-live", "polite"));
  });
});

describe("the full testimonial dialog", () => {
  test("opens as a real dialog and closes on Escape", async () => {
    const user = userEvent.setup();
    await mountSection();

    await user.click(screen.getByRole("button", { name: /First testimonial/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Testimonial from Ada");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("steps between testimonials from inside the dialog", async () => {
    const user = userEvent.setup();
    await mountSection();

    await user.click(screen.getByRole("button", { name: /First testimonial/ }));
    const dialog = await screen.findByRole("dialog");

    // Scoped to the dialog: the carousel's own arrows carry the same labels,
    // and in the browser react-modal aria-hides the page behind the dialog so
    // only these two exist for assistive tech.
    const inDialog = within(dialog);

    // The first testimonial has nothing before it.
    expect(inDialog.getByRole("button", { name: "Previous testimonial" })).toBeDisabled();

    await user.click(inDialog.getByRole("button", { name: "Next testimonial" }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Testimonial from Grace");
  });
});

describe("ProfileImage", () => {
  test("lazy-loads an avatar and falls back to a placeholder when it fails", async () => {
    getDocs.mockResolvedValue(snapshotOf([
      { ...TESTIMONIALS[0], profileImage: "https://example.test/ada.jpg" },
    ]));
    await mountSection();

    const avatar = screen.getByRole("img", { name: "Ada profile" });
    expect(avatar).toHaveAttribute("loading", "lazy");

    // The old code swapped the placeholder in by writing to nextSibling.style
    // from onError, mutating nodes React owns.
    fireEvent.error(avatar);
    await waitFor(() =>
      expect(screen.queryByRole("img", { name: "Ada profile" })).not.toBeInTheDocument()
    );
  });
});
