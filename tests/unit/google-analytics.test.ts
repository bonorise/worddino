import { describe, expect, it } from "vitest";
import {
  buildGoogleAnalyticsBootstrapScript,
  shouldEnableGoogleAnalytics,
} from "@/components/analytics/google-analytics";

describe("google analytics", () => {
  it("only enables analytics when a measurement id exists", () => {
    expect(shouldEnableGoogleAnalytics(undefined)).toBe(false);
    expect(shouldEnableGoogleAnalytics("")).toBe(false);
    expect(shouldEnableGoogleAnalytics("G-TEST1234")).toBe(true);
  });

  it("boots analytics with the current location for the initial page view", () => {
    const script = buildGoogleAnalyticsBootstrapScript("G-TEST1234");

    expect(script).toContain("G-TEST1234");
    expect(script).toContain("window.location.pathname + window.location.search");
    expect(script).toContain("page_location: window.location.href");
    expect(script).not.toContain("send_page_view: false");
  });
});
