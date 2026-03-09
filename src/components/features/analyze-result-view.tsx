"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookOpenText, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WordFamilyGraph } from "@/components/features/word-family-graph";
import type { LocaleCode } from "@/lib/types";
import type { AnalyzeApiResponse, AnalyzeSuccessResponse, WordAnalysisResult } from "@/types";

const analysisStorageKey = (locale: LocaleCode, word: string) =>
  `worddino:analysis:${locale}:${word.toLowerCase()}`;

interface AnalyzeResultLabels {
  loading: string;
  error: string;
  retry: string;
  sourceLabel: string;
  sourceGemini: string;
  explanation: string;
  morphemeTitle: string;
  morphemeFallback: string;
  mnemonicsTitle: string;
  recommendation: string;
  examplesTitle: string;
  familyTitle: string;
  familyHint: string;
  familyEmpty: string;
}

interface AnalyzeResultViewProps {
  locale: LocaleCode;
  word: string;
  labels: AnalyzeResultLabels;
}

export function AnalyzeResultView({ locale, word, labels }: AnalyzeResultViewProps) {
  const [data, setData] = useState<WordAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      const cached = sessionStorage.getItem(analysisStorageKey(locale, word));
      if (cached) {
        const parsed = JSON.parse(cached) as WordAnalysisResult;
        if (parsed.normalizedWord === word.toLowerCase() && parsed.locale === locale) {
          setData(parsed);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word, locale }),
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "analyze failed" : payload.message);
      }

      const analysis = (payload as AnalyzeSuccessResponse).data;
      setData(analysis);
      sessionStorage.setItem(analysisStorageKey(locale, word), JSON.stringify(analysis));
      sessionStorage.setItem(
        analysisStorageKey(locale, analysis.normalizedWord),
        JSON.stringify(analysis),
      );
      setIsLoading(false);
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  }, [locale, word]);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{labels.loading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (hasError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {labels.error}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void fetchAnalysis()}>
            <RefreshCw className="h-4 w-4" />
            {labels.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="shadow-fossil">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-serif text-3xl">{data.normalizedWord}</CardTitle>
            <Badge variant="secondary">
              {labels.sourceLabel}: {labels.sourceGemini}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {labels.explanation}
          </p>
          <p className="leading-7 text-muted-foreground">{data.explanation}</p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{labels.morphemeTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.decomposable && data.morphemes.length > 0 ? (
                data.morphemes.map((morpheme) => (
                  <div
                    key={`${morpheme.kind}-${morpheme.text}`}
                    className="rounded-lg border border-border bg-card/70 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{morpheme.text}</span>
                      <Badge variant={morpheme.kind === "root" ? "default" : "outline"}>
                        {morpheme.kind}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{morpheme.meaning}</p>
                  </div>
                ))
              ) : (
                <Badge variant="outline">{labels.morphemeFallback}</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4" />
                {labels.examplesTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.examples.length > 0 ? (
                data.examples.map((example) => (
                  <p
                    key={example}
                    className="rounded-lg border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground"
                  >
                    {example}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{labels.morphemeFallback}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {labels.mnemonicsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.mnemonics.map((item) => (
                <div
                  key={`${item.type}-${item.title}`}
                  className="rounded-xl border border-border bg-card/80 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="font-medium">{item.title}</h3>
                    {item.type === data.recommendedType ? (
                      <Badge>{labels.recommendation}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{item.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <WordFamilyGraph
            locale={locale}
            title={labels.familyTitle}
            hint={labels.familyHint}
            empty={labels.familyEmpty}
            word={data.normalizedWord}
            familyWords={data.familyWords}
          />
        </div>
      </div>
    </div>
  );
}
