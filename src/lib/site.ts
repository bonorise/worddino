import type { Metadata } from "next";

export const SITE_URL = new URL("https://www.worddino.com");

export function buildCanonicalUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

export function getGoogleSiteVerification() {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}

export function getGaMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;
}

export function buildRootMetadata(googleVerification = getGoogleSiteVerification()): Metadata {
  return {
    metadataBase: SITE_URL,
    title: "WordDino",
    description: "Dig up the roots. Master the words.",
    verification: googleVerification
      ? {
          google: googleVerification,
        }
      : undefined,
  };
}
