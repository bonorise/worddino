"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

interface LanguageSwitcherProps {
  locale: "zh-CN" | "en";
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locales = ["zh-CN", "en"] as const;
  const localeLabel: Record<(typeof locales)[number], string> = {
    "zh-CN": "中",
    en: "EN",
  };

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          const targetPath = pathname.replace(
            /^\/(zh-CN|en)(?=\/|$)/,
            `/${nextLocale}`,
          );
          router.push(targetPath as Route);
        }}
        aria-label="switch language"
        className="h-8 appearance-none bg-transparent pr-5 text-xs font-semibold tracking-widest text-foreground/70 transition-colors hover:text-foreground focus:outline-none"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabel[item]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-[10px] text-foreground/50">
        ▾
      </span>
    </div>
  );
}
