import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ExamplesList } from "@/components/features/examples-list";
import { MnemonicTabs } from "@/components/features/mnemonic-tabs";
import { MorphemeBreakdown } from "@/components/features/morpheme-breakdown";
import { RootMindMap } from "@/components/features/root-mind-map";
import { WordGenerating } from "@/components/features/word-generating";
import { WordHeader } from "@/components/features/word-header";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedText } from "@/lib/i18n/content";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";
import type { LocaleCode } from "@/lib/types";
import { getWordBySlug } from "@/lib/word/repository";
import { createFingerprint, getVisitorCookieName } from "@/lib/vote/fingerprint";

export default async function WordPage({
  params,
}: {
  params: Promise<{ locale: LocaleCode; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  const t = await getTranslations("word");

  let normalizedSlug = "";
  try {
    normalizedSlug = normalizeSlug(rawSlug);
  } catch (error: unknown) {
    if (error instanceof InvalidSlugError) {
      return (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("notFound")}</CardContent>
        </Card>
      );
    }
    throw error;
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const visitorId = cookieStore.get(getVisitorCookieName())?.value;
  const fingerprint = visitorId
    ? createFingerprint(visitorId, headerStore.get("user-agent") ?? "unknown")
    : undefined;

  const word = await getWordBySlug(normalizedSlug, fingerprint);
  if (!word || word.status !== "ready") {
    return (
      <WordGenerating
        slug={normalizedSlug}
        generatingText={t("generating")}
        retryText={t("retry")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <WordHeader
        locale={locale}
        word={word}
        labels={{
          speak: t("speak"),
          voteUp: t("voteUp"),
          voteDown: t("voteDown"),
        }}
      />
      <Card>
        <CardContent className="p-5 text-base leading-7">
          {getLocalizedText(word.gloss, locale)}
        </CardContent>
      </Card>
      <MorphemeBreakdown
        locale={locale}
        title={t("morphemeTitle")}
        fallback={t("morphemeFallback")}
        decomposable={word.decomposable}
        morphemes={word.morphemes}
      />
      <MnemonicTabs
        locale={locale}
        word={word}
        labels={{
          title: t("mnemonicTitle"),
          recommended: t("mnemonicRecommended"),
          homophone: t("mnemonicHomophone"),
          image: t("mnemonicImage"),
          story: t("mnemonicStory"),
          imagePrompt: t("imagePrompt"),
          copyPrompt: t("copyPrompt"),
        }}
      />
      <ExamplesList
        locale={locale}
        title={t("examplesTitle")}
        showTranslationLabel={t("showTranslation")}
        hideTranslationLabel={t("hideTranslation")}
        examples={word.examples}
      />
      <RootMindMap locale={locale} title={t("treeTitle")} hint={t("treeHint")} word={word} />
      <Card>
        <CardContent className="p-5 text-xs text-muted-foreground">{t("aiDisclaimer")}</CardContent>
      </Card>
    </div>
  );
}
