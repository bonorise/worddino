import type { MetadataRoute } from "next";
import { buildCanonicalUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: buildCanonicalUrl("/sitemap.xml"),
  };
}
