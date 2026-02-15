import { getTranslations } from "next-intl/server";
import { SearchHero } from "@/components/features/search-hero";
import type { LocaleCode } from "@/lib/types";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: LocaleCode }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");

  return (
    <div className="space-y-6">
      <SearchHero
        locale={locale}
        title={t("title")}
        subtitle={t("subtitle")}
        placeholder={t("placeholder")}
        cta={t("cta")}
        examplesLabel={t("examples")}
        methodTip={t("methodTip")}
      />
    </div>
  );
}
