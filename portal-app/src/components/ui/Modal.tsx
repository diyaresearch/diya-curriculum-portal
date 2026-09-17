/**
 * The one modal (#373).
 *
 * The app had two kinds. Eight files used react-modal directly, each carrying
 * its own `customStyles` object and four of them repeating the same
 * Modal.setAppElement bootstrap. Nine more hand-rolled a fixed-position
 * overlay with an absolutely-positioned "x" - and those had no focus trap, no
 * Escape handling, no scroll lock, and no dialog semantics, so a keyboard user
 * could tab straight out of the dialog into the page behind it and a screen
 * reader never announced that a dialog had opened.
 *
 * This wraps react-modal rather than replacing it: the accessibility
 * behaviour it already implements is exactly the part the hand-rolled
 * versions were missing, and reimplementing a focus trap correctly is not a
 * thing to do twice.
 *
 *   <Modal open={isOpen} onClose={close} title="Delete this lesson?">
 *     ...
 *   </Modal>
 */

import { useEffect, type ReactNode } from "react";
import ReactModal from "react-modal";

const SIZES = { small: 380, medium: 560, large: 860, full: "min(1100px, 94vw)" } as const;

export type ModalSize = keyof typeof SIZES;

/**
 * react-modal needs to know which element to hide from assistive tech while a
 * dialog is open. This was repeated in four files; doing it once here means a
 * new modal cannot forget it.
 */
let appElementSet = false;
function ensureAppElement(): void {
  if (appElementSet || typeof document === "undefined") return;
  // Only a real #root. Falling back to document.body would put aria-hidden on
  // the whole document - including this dialog - which is worse than not
  // setting it at all.
  const appRoot = document.getElementById("root");
  if (appRoot) {
    ReactModal.setAppElement(appRoot);
    appElementSet = true;
  }
}

/** Whether hiding the app from assistive tech is safe to switch on. */
function canHideApp(): boolean {
  return typeof document !== "undefined" && !!document.getElementById("root");
}

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  /** Rendered as the dialog heading and used as its accessible name. */
  title?: ReactNode;
  children?: ReactNode;
  size?: ModalSize;
  /**
   * Some dialogs report the outcome of something already committed, where
   * dismissing by accident loses the message. Those pass false: it drops the
   * close button and ignores Escape and backdrop clicks.
   */
  dismissable?: boolean;
  /** Accessible name when `title` is not a plain string. Defaults to it. */
  contentLabel?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "medium",
  dismissable = true,
  contentLabel,
}: ModalProps) {
  useEffect(ensureAppElement, []);

  return (
    <ReactModal
      isOpen={!!open}
      onRequestClose={onClose}
      ariaHideApp={canHideApp()}
      shouldCloseOnEsc={dismissable}
      shouldCloseOnOverlayClick={dismissable}
      contentLabel={contentLabel || (typeof title === "string" ? title : undefined) || "Dialog"}
      aria={title ? { labelledby: "diya-modal-title" } : undefined}
      style={{
        overlay: {
          backgroundColor: "rgba(0,0,0,0.45)",
          zIndex: 3000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        },
        content: {
          position: "static",
          inset: "auto",
          width: SIZES[size] ?? SIZES.medium,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 0,
          border: "none",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
        },
      }}
    >
      <div className="relative p-7">
        {dismissable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-3 right-4 cursor-pointer border-0 bg-transparent text-[1.6rem] leading-none text-[#6b7280]"
          >
            ×
          </button>
        )}
        {title && (
          <h2
            id="diya-modal-title"
            className="mt-0 mr-0 mb-4 ml-0 pr-8 text-section-title font-bold text-navy"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </ReactModal>
  );
}
