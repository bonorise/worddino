import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

interface SiteHeaderProps {
  locale: "zh-CN" | "en";
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="font-serif text-xl font-semibold tracking-wide">
          WordDino
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link href={`/${locale}`}>{t("home")}</Link>
          <Link href={`/${locale}/about`}>{t("about")}</Link>
          <Link href={`/${locale}/privacy`}>{t("privacy")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
