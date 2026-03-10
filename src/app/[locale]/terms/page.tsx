import type { Metadata } from "next";
import { useTranslations } from "next-intl";
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
      canonical: buildCanonicalUrl(`/${locale}/terms`),
    },
  };
}

export default function TermsPage() {
  const t = useTranslations("terms");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>{t("content")}</p>
      </CardContent>
    </Card>
  );
}
