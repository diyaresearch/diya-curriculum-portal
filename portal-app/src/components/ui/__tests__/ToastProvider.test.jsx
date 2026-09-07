import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

/**
 * Drives the provider the way a real component does - through handlers -
 * rather than reaching into the context value. Capturing it out of render
 * would be a render side effect, which react-hooks/globals rejects.
 */
function Harness() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("saved")}>ok</button>
      <button onClick={() => toast.error("could not save")}>fail</button>
      <button onClick={() => toast.info("heads up")}>note</button>
      <button onClick={() => toast.error(null)}>silent</button>
      <button onClick={() => toast.success("temporary", { duration: 1000 })}>brief</button>
    </>
  );
}

function mountProvider() {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>
  );
}

describe("ToastProvider", () => {
  test("shows a message and announces it politely", async () => {
    const user = userEvent.setup();
    mountProvider();
    await user.click(screen.getByRole("button", { name: "fail" }));

    expect(await screen.findByText("could not save")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  test("stacks multiple messages instead of replacing them", async () => {
    const user = userEvent.setup();
    mountProvider();
    await user.click(screen.getByRole("button", { name: "ok" }));
    await user.click(screen.getByRole("button", { name: "fail" }));

    expect(await screen.findByText("saved")).toBeInTheDocument();
    expect(screen.getByText("could not save")).toBeInTheDocument();
  });

  test("ignores a null message, so callers need not guard toUserMessage's null", async () => {
    const user = userEvent.setup();
    mountProvider();
    await user.click(screen.getByRole("button", { name: "silent" }));

    // Asserting the absence of any toast: there is no Testing Library query
    // for "nothing rendered", and the live region itself must still exist.
    // eslint-disable-next-line testing-library/no-node-access
    expect(screen.getByRole("status").children).toHaveLength(0);
  });

  test("can be dismissed by the user", async () => {
    const user = userEvent.setup();
    mountProvider();
    await user.click(screen.getByRole("button", { name: "note" }));

    await screen.findByText("heads up");
    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));
    await waitFor(() => expect(screen.queryByText("heads up")).not.toBeInTheDocument());
  });

  test("auto-dismisses after its duration", async () => {
    vi.useFakeTimers();
    try {
      mountProvider();
      fireEvent.click(screen.getByRole("button", { name: "brief" }));
      expect(screen.getByText("temporary")).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(1001);
      expect(screen.queryByText("temporary")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("useToast outside the provider fails loudly rather than swallowing messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/must be used inside a <ToastProvider>/);
    spy.mockRestore();
  });
});
