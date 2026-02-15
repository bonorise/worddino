"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeSlug } from "@/lib/slug";
import type { LocaleCode } from "@/lib/types";

interface SearchHeroProps {
  locale: LocaleCode;
  title: string;
  subtitle: string;
  placeholder: string;
  cta: string;
  examplesLabel: string;
  methodTip: string;
}

const sampleWords = ["transport", "inspect", "construct", "people", "portable"];

export function SearchHero({
  locale,
  title,
  subtitle,
  placeholder,
  cta,
  examplesLabel,
  methodTip,
}: SearchHeroProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const navigate = (rawWord: string) => {
    try {
      const slug = normalizeSlug(rawWord);
      router.push(`/${locale}/word/${slug}`);
    } catch {
      toast.error(locale === "zh-CN" ? "请输入有效英文单词" : "Please input a valid word");
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-fossil md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-grain bg-[size:6px_6px] opacity-60" />
      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <h1 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">{title}</h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{subtitle}</p>
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(value);
          }}
        >
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="h-12 rounded-xl bg-background/95"
          />
          <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
            <Search className="h-4 w-4" />
            {cta}
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground/90">{examplesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {sampleWords.map((word) => (
              <Button
                key={word}
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => navigate(word)}
              >
                {word}
              </Button>
            ))}
          </div>
        </div>

        <p className="rounded-lg border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {methodTip}
        </p>
      </div>
    </section>
  );
}
