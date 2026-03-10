import type { MetadataRoute } from "next";
import { buildCanonicalUrl } from "@/lib/site";

const stablePaths = [
  "/zh-CN",
  "/en",
  "/zh-CN/about",
  "/en/about",
  "/zh-CN/privacy",
  "/en/privacy",
  "/zh-CN/terms",
  "/en/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return stablePaths.map((path) => ({
    url: buildCanonicalUrl(path),
  }));
}
