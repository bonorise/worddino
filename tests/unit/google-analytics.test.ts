import { describe, expect, it } from "vitest";
import { shouldEnableGoogleAnalytics } from "@/components/analytics/google-analytics";

describe("google analytics", () => {
  it("only enables analytics when a measurement id exists", () => {
    expect(shouldEnableGoogleAnalytics(undefined)).toBe(false);
    expect(shouldEnableGoogleAnalytics("")).toBe(false);
    expect(shouldEnableGoogleAnalytics("G-TEST1234")).toBe(true);
  });
});
