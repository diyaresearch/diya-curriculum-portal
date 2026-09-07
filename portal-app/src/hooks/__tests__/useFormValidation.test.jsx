import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import useFormValidation from "@/hooks/useFormValidation";
import { everyItem, required, requiredRichText } from "@/utils/validators";

const schema = {
  Title: [required("Title")],
  Description: [requiredRichText("Description")],
  Category: [required("Category")],
};

describe("useFormValidation", () => {
  test("reports EVERY failing field at once, not just the first", () => {
    // The behaviour this replaces: four sequential toasts, so a form with
    // three mistakes took three submits to discover them.
    const { result } = renderHook(() => useFormValidation(schema));

    let ok;
    act(() => {
      ok = result.current.validateAll({ Title: "", Description: "<p><br></p>", Category: [] });
    });

    expect(ok).toBe(false);
    expect(Object.keys(result.current.errors).sort()).toEqual(["Category", "Description", "Title"]);
  });

  test("passes a complete form", () => {
    const { result } = renderHook(() => useFormValidation(schema));
    let ok;
    act(() => {
      ok = result.current.validateAll({
        Title: "Intro to ML",
        Description: "<p>Real text</p>",
        Category: ["AI"],
      });
    });
    expect(ok).toBe(true);
    expect(result.current.hasErrors).toBe(false);
  });

  test("stays quiet until the first submit", () => {
    // Flagging a half-typed title while the user is still in the field is
    // the behaviour this deliberately avoids.
    const { result } = renderHook(() => useFormValidation(schema));
    act(() => result.current.revalidate("Title", ""));
    expect(result.current.errors).toEqual({});
  });

  test("clears a field's error once the user fixes it", () => {
    const { result } = renderHook(() => useFormValidation(schema));
    act(() => {
      result.current.validateAll({ Title: "", Description: "<p>x</p>", Category: ["AI"] });
    });
    expect(result.current.errors.Title).toBeTruthy();

    act(() => result.current.revalidate("Title", "Now filled in"));
    expect(result.current.errors.Title).toBeUndefined();
    expect(result.current.hasErrors).toBe(false);
  });

  test("clear() resets back to the pre-submit state", () => {
    const { result } = renderHook(() => useFormValidation(schema));
    act(() => result.current.validateAll({ Title: "", Description: "", Category: [] }));
    expect(result.current.hasErrors).toBe(true);

    act(() => result.current.clear());
    expect(result.current.errors).toEqual({});
    act(() => result.current.revalidate("Title", ""));
    expect(result.current.errors).toEqual({});
  });
});

describe("validators", () => {
  test("required treats blank strings and empty arrays as missing", () => {
    expect(required("Title")("")).toMatch(/required/);
    expect(required("Title")("   ")).toMatch(/required/);
    expect(required("Category")([])).toMatch(/required/);
    expect(required("Title")("ok")).toBeNull();
    expect(required("Category")(["AI"])).toBeNull();
  });

  test("requiredRichText sees through an empty Quill document", () => {
    // The bug a plain required() would have: "<p><br></p>" is a non-empty
    // string, so an untouched editor would pass.
    expect(requiredRichText("Description")("<p><br></p>")).toMatch(/required/);
    expect(requiredRichText("Description")("<p>&nbsp;</p>")).toMatch(/required/);
    expect(requiredRichText("Description")("<p>Real content</p>")).toBeNull();
  });

  test("everyItem points at which entry failed", () => {
    const rule = everyItem("Section content", required("Section content"));
    expect(rule(["intro", "", "third"])).toMatch(/item 2/);
    expect(rule(["a", "b"])).toBeNull();
  });
});
