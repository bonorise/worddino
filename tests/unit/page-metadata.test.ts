import { describe, expect, it } from "vitest";
import { generateMetadata as generateAboutMetadata } from "@/app/[locale]/about/page";
import { generateMetadata as generateHomeMetadata } from "@/app/[locale]/page";
import { generateMetadata as generateWordMetadata } from "@/app/[locale]/word/[slug]/page";

describe("page metadata", () => {
  it("sets canonical for locale home", async () => {
    const metadata = await generateHomeMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/zh-CN");
  });

  it("sets canonical for static content pages", async () => {
    const metadata = await generateAboutMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/en/about");
  });

  it("sets canonical for word detail pages", async () => {
    const metadata = await generateWordMetadata({
      params: Promise.resolve({ locale: "en", slug: "transport" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/en/word/transport");
  });
});
