import { describe, expect, it } from "vitest";
import {
  closestIsin,
  hasValidCheckDigit,
  isinCheckDigit,
  isValidIsinFormat,
  levenshtein,
  normalizeIsin,
} from "@/lib/validation/isin";

describe("normalizeIsin", () => {
  it("uppercases and strips spaces, hyphens and dots", () => {
    expect(normalizeIsin("ie00 b4l5-y9.83")).toBe("IE00B4L5Y983");
  });
});

describe("isValidIsinFormat", () => {
  it.each(["IE00B4L5Y983", "US0378331005"])("accepts %s", (isin) => {
    expect(isValidIsinFormat(isin)).toBe(true);
  });

  it.each([
    ["too short", "IE00B4L5Y98"],
    ["too long", "IE00B4L5Y9833"],
    ["digit country code", "1E00B4L5Y983"],
    ["letter check digit", "IE00B4L5Y98X"],
    ["lowercase (not normalized)", "ie00b4l5y983"],
    ["empty", ""],
  ])("rejects %s", (_, isin) => {
    expect(isValidIsinFormat(isin)).toBe(false);
  });
});

describe("check digit", () => {
  it.each([
    ["IE00B4L5Y983", 3],
    ["IE00BK5BQT80", 0],
    ["US0378331005", 5],
  ])("%s has check digit %i", (isin, digit) => {
    expect(isinCheckDigit(isin.slice(0, 11))).toBe(digit);
    expect(hasValidCheckDigit(isin)).toBe(true);
  });

  it("rejects a wrong last digit", () => {
    expect(hasValidCheckDigit("IE00B4L5Y984")).toBe(false);
  });

  it("rejects a single misheard character", () => {
    expect(hasValidCheckDigit("IE00B4L5Y883")).toBe(false);
  });

  it("rejects a badly formatted value", () => {
    expect(hasValidCheckDigit("IE00B4L5Y9")).toBe(false);
  });
});

describe("closestIsin", () => {
  const known = ["IE00B4L5Y983", "IE00BK5BQT80", "IE00B5BMR087"];

  it("suggests the nearest known ISIN for a one-character slip", () => {
    expect(closestIsin("IE00B4L5Y984", known)).toBe("IE00B4L5Y983");
  });

  it("returns null when nothing is close", () => {
    expect(closestIsin("US0378331005", known)).toBeNull();
  });

  it("levenshtein counts edits", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });
});
