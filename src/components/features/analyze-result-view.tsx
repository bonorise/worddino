"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocaleCode } from "@/lib/types";
import type { AnalyzeApiResponse, AnalyzeSuccessResponse, WordAnalysisResult } from "@/types";

const analysisStorageKey = (word: string) => `worddino:analysis:${word.toLowerCase()}`;

interface AnalyzeResultLabels {
  loading: string;
  error: string;
  retry: string;
  sourceLabel: string;
  sourceMock: string;
  sourceAi: string;
  explanation: string;
  rootsTitle: string;
  rootsFound: string;
  rootsNotFound: string;
  examples: string;
  mnemonicsTitle: string;
  recommendation: string;
}

interface AnalyzeResultViewProps {
  locale: LocaleCode;
  word: string;
  labels: AnalyzeResultLabels;
}

function getLocalizedText(locale: LocaleCode, zhCN: string, en: string) {
  return locale === "zh-CN" ? zhCN : en;
}

export function AnalyzeResultView({ locale, word, labels }: AnalyzeResultViewProps) {
  const [data, setData] = useState<WordAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sourceText = useMemo(() => {
    if (!data) {
      return labels.sourceMock;
    }
    return data.source === "ai" ? labels.sourceAi : labels.sourceMock;
  }, [data, labels.sourceAi, labels.sourceMock]);

  const fetchAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      const cached = sessionStorage.getItem(analysisStorageKey(word));
      if (cached) {
        const parsed = JSON.parse(cached) as WordAnalysisResult;
        if (parsed.normalizedWord === word.toLowerCase()) {
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
        body: JSON.stringify({ word }),
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "analyze failed" : payload.message);
      }

      const analysis = (payload as AnalyzeSuccessResponse).data;
      setData(analysis);
      sessionStorage.setItem(analysisStorageKey(word), JSON.stringify(analysis));
      sessionStorage.setItem(
        analysisStorageKey(analysis.normalizedWord),
        JSON.stringify(analysis),
      );
      setIsLoading(false);
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  }, [word]);

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
              {labels.sourceLabel}: {sourceText}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {labels.explanation}
          </p>
          <p className="leading-7 text-muted-foreground">
            {getLocalizedText(locale, data.explanation.zhCN, data.explanation.en)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{labels.rootsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.rootFound ? (
              <>
                <Badge>{labels.rootsFound}</Badge>
                {data.matchedRoots.map((root) => (
                  <div key={`${root.kind}-${root.text}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{root.text}</span>
                      <Badge variant="outline">{root.kind}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {getLocalizedText(locale, root.meaning.zhCN, root.meaning.en)}
                    </p>
                    {root.hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{root.hint}</p>
                    ) : null}
                    {root.examples.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">{labels.examples}:</span>
                        {root.examples.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : (
              <Badge variant="outline">{labels.rootsNotFound}</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {labels.mnemonicsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.mnemonicCards.map((item) => (
              <div
                key={item.type}
                className="rounded-xl border border-border bg-card/80 p-3 transition-colors hover:bg-muted/30"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.type === data.recommendedType ? (
                    <Badge>{labels.recommendation}</Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  {getLocalizedText(locale, item.contentZhCN, item.contentEn)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
