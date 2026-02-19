import { getTranslations } from "next-intl/server";
import { AnalyzeResultView } from "@/components/features/analyze-result-view";
import { Card, CardContent } from "@/components/ui/card";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";
import type { LocaleCode } from "@/lib/types";

export default async function WordPage({
  params,
}: {
  params: Promise<{ locale: LocaleCode; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  const tWord = await getTranslations("word");
  const tAnalyze = await getTranslations("analyze");

  try {
    const normalizedSlug = normalizeSlug(rawSlug);
    return (
      <AnalyzeResultView
        locale={locale}
        word={normalizedSlug}
        labels={{
          loading: tAnalyze("loading"),
          error: tAnalyze("error"),
          retry: tAnalyze("retry"),
          sourceLabel: tAnalyze("sourceLabel"),
          sourceMock: tAnalyze("sourceMock"),
          sourceAi: tAnalyze("sourceAi"),
          explanation: tAnalyze("explanation"),
          rootsTitle: tAnalyze("rootsTitle"),
          rootsFound: tAnalyze("rootsFound"),
          rootsNotFound: tAnalyze("rootsNotFound"),
          parseTreeTitle: tAnalyze("parseTreeTitle"),
          parseTreeHint: tAnalyze("parseTreeHint"),
          parseTreeEmpty: tAnalyze("parseTreeEmpty"),
          examples: tAnalyze("examples"),
          mnemonicsTitle: tAnalyze("mnemonicsTitle"),
          recommendation: tAnalyze("recommendation"),
        }}
      />
    );
  } catch (error: unknown) {
    if (error instanceof InvalidSlugError) {
      return (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{tWord("notFound")}</CardContent>
        </Card>
      );
    }
    throw error;
  }
}
