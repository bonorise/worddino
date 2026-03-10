import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCanonicalUrl } from "@/lib/site";
import type { LocaleCode } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: LocaleCode }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: {
      canonical: buildCanonicalUrl(`/${locale}/about`),
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>{t("content")}</p>
        <p>AI generated content may contain bias or inaccuracies. Verify with reliable dictionaries.</p>
      </CardContent>
    </Card>
  );
}
