import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("seo routes", () => {
  it("points robots to the production sitemap", () => {
    const result = robots();

    expect(result.sitemap).toBe("https://www.worddino.com/sitemap.xml");
  });

  it("returns only stable locale pages in the sitemap", async () => {
    const result = await sitemap();

    expect(result.map((item) => item.url)).toEqual([
      "https://www.worddino.com/zh-CN",
      "https://www.worddino.com/en",
      "https://www.worddino.com/zh-CN/about",
      "https://www.worddino.com/en/about",
      "https://www.worddino.com/zh-CN/privacy",
      "https://www.worddino.com/en/privacy",
      "https://www.worddino.com/zh-CN/terms",
      "https://www.worddino.com/en/terms",
    ]);
  });
});
