import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import FieldError, { fieldErrorProps } from "@/components/ui/FieldError";

describe("FieldError", () => {
  test("renders nothing when the field is valid", () => {
    const { container } = render(<FieldError id="Title" message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("announces the message and carries the id its input points at", () => {
    render(<FieldError id="Title" message="Title is required." />);
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Title is required.");
    expect(error).toHaveAttribute("id", "Title-error");
  });

  test("fieldErrorProps links the input to the message", () => {
    // Without this pairing a screen-reader user is told nothing about why the
    // form will not submit - which was true of every form before #371.
    expect(fieldErrorProps("Title", "Title is required.")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "Title-error",
    });
    expect(fieldErrorProps("Title", null)).toEqual({
      "aria-invalid": undefined,
      "aria-describedby": undefined,
    });
  });
});
