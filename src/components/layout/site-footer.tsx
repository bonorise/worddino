import Link from "next/link";
import { useTranslations } from "next-intl";

interface SiteFooterProps {
  locale: "zh-CN" | "en";
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const t = useTranslations("footer");

  return (
    <footer className="w-full border-t border-border/60 bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-foreground/50">
          WordDino
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`/${locale}/about`} className="hover:text-foreground">
            {t("about")}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-foreground">
            {t("terms")}
          </Link>
        </div>
        <div className="text-xs text-foreground/40">© 2026 WordDino</div>
      </div>
    </footer>
  );
}
