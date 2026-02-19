import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BrandBanner } from "@/components/layout/brand-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";
import type { LocaleCode } from "@/lib/types";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const typedLocale = locale as LocaleCode;

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader locale={typedLocale} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
          {children}
        </main>
        <BrandBanner />
        <SiteFooter locale={typedLocale} />
      </div>
    </NextIntlClientProvider>
  );
}
