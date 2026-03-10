import { describe, expect, it, vi } from "vitest";
import {
  buildCanonicalUrl,
  buildRootMetadata,
  getGaMeasurementId,
  getGoogleSiteVerification,
  SITE_URL,
} from "@/lib/site";

describe("site helpers", () => {
  it("builds canonical URLs on the www primary domain", () => {
    expect(SITE_URL.toString()).toBe("https://www.worddino.com/");
    expect(buildCanonicalUrl("/zh-CN")).toBe("https://www.worddino.com/zh-CN");
    expect(buildCanonicalUrl("/en/about")).toBe("https://www.worddino.com/en/about");
  });

  it("trims google verification and ga ids from env", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "  verify-token  ");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "  G-TEST1234  ");

    expect(getGoogleSiteVerification()).toBe("verify-token");
    expect(getGaMeasurementId()).toBe("G-TEST1234");
  });

  it("builds root metadata with google verification", () => {
    const metadata = buildRootMetadata("verify-token");

    expect(metadata.metadataBase?.toString()).toBe("https://www.worddino.com/");
    expect(metadata.verification?.google).toBe("verify-token");
  });
});
