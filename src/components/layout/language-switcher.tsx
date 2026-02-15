"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface LanguageSwitcherProps {
  locale: "zh-CN" | "en";
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const targetLocale = locale === "zh-CN" ? "en" : "zh-CN";
  const targetPath = pathname.replace(/^\/(zh-CN|en)(?=\/|$)/, `/${targetLocale}`);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push(targetPath)}
      aria-label="switch language"
    >
      <Languages className="h-4 w-4" />
      {targetLocale}
    </Button>
  );
}
