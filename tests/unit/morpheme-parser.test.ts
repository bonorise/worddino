import { describe, expect, it } from "vitest";
import { parseMorphemeCandidates } from "@/lib/services/analyzer";

describe("parseMorphemeCandidates", () => {
  it("should parse prefix + root", () => {
    const candidates = parseMorphemeCandidates("respect");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.formula).toBe("re + spect");
    expect(candidates[0]?.nodes.map((node) => node.kind)).toEqual(["prefix", "root"]);
  });

  it("should parse prefix + root + suffix", () => {
    const candidates = parseMorphemeCandidates("transportable");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.nodes.map((node) => node.text)).toEqual([
      "trans",
      "port",
      "able",
    ]);
    expect(candidates[0]?.nodes.map((node) => node.kind)).toEqual([
      "prefix",
      "root",
      "suffix",
    ]);
  });

  it("should require at least one root", () => {
    const candidates = parseMorphemeCandidates("anti");
    expect(candidates).toHaveLength(0);
  });
});
