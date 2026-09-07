import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import Modal from "@/components/ui/Modal";

describe("Modal", () => {
  test("renders nothing while closed", () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden">body</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("exposes a dialog labelled by its title", () => {
    // The nine hand-rolled overlays this replaces were plain divs: a screen
    // reader was never told a dialog had opened, or what it was for.
    render(<Modal open onClose={() => {}} title="Delete this lesson?">body</Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete this lesson?" })).toBeInTheDocument();
  });

  test("closes on the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal open onClose={onClose} title="Closeable">body</Modal>);

    await user.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal open onClose={onClose} title="Closeable">body</Modal>);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("a non-dismissable dialog ignores Escape and offers no close button", async () => {
    // For dialogs reporting an outcome already committed, where dismissing by
    // accident loses the message.
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Result" dismissable={false}>
        Saved
      </Modal>
    );

    expect(screen.queryByRole("button", { name: /close dialog/i })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("renders its children", () => {
    render(
      <Modal open onClose={() => {}} title="Wrapper">
        <p>inner content</p>
      </Modal>
    );
    expect(screen.getByText("inner content")).toBeInTheDocument();
  });
});
