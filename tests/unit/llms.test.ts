import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("llms.txt", () => {
  it("documents the site and links to the sitemap", () => {
    const content = readFileSync("public/llms.txt", "utf8");

    expect(content).toContain("WordDino");
    expect(content).toContain("https://www.worddino.com/sitemap.xml");
  });
});
