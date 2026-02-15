import { describe, expect, it } from "vitest";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";

describe("normalizeSlug", () => {
  it("should normalize to lowercase", () => {
    expect(normalizeSlug("Transport")).toBe("transport");
  });

  it("should keep apostrophe and hyphen", () => {
    expect(normalizeSlug("rock-'n'-roll")).toBe("rock-'n'-roll");
  });

  it("should throw on invalid characters", () => {
    expect(() => normalizeSlug("hello world")).toThrow(InvalidSlugError);
    expect(() => normalizeSlug("abc123")).toThrow(InvalidSlugError);
  });
});
