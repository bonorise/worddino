"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocaleCode } from "@/lib/types";
import type { MorphemeParseCandidate } from "@/types";

interface MorphemeParseTreeProps {
  locale: LocaleCode;
  word: string;
  title: string;
  hint: string;
  empty: string;
  candidates: MorphemeParseCandidate[];
}

function getMeaning(
  node: MorphemeParseCandidate["nodes"][number],
  locale: LocaleCode,
): string {
  return locale === "zh-CN" ? node.meaning.zhCN : node.meaning.en;
}

function getKindLabel(kind: MorphemeParseCandidate["nodes"][number]["kind"], locale: LocaleCode) {
  if (locale === "zh-CN") {
    if (kind === "prefix") return "前缀";
    if (kind === "root") return "词根";
    return "后缀";
  }

  if (kind === "prefix") return "Prefix";
  if (kind === "root") return "Root";
  return "Suffix";
}

function getCandidateLabel(index: number, locale: LocaleCode): string {
  return locale === "zh-CN" ? `方案 ${index + 1}` : `Option ${index + 1}`;
}

function getScoreLabel(score: number, locale: LocaleCode): string {
  return locale === "zh-CN" ? `置信分 ${score.toFixed(2)}` : `Confidence ${score.toFixed(2)}`;
}

export function MorphemeParseTree({
  locale,
  word,
  title,
  hint,
  empty,
  candidates,
}: MorphemeParseTreeProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = useMemo(() => {
    if (candidates.length === 0) {
      return 0;
    }
    return Math.min(activeIndex, candidates.length - 1);
  }, [activeIndex, candidates.length]);
  const active = candidates[safeIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate, index) => (
                <Button
                  key={candidate.formula}
                  size="sm"
                  variant={index === safeIndex ? "default" : "outline"}
                  onClick={() => setActiveIndex(index)}
                >
                  {getCandidateLabel(index, locale)}
                </Button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{getScoreLabel(active.score, locale)}</Badge>
                <code className="rounded bg-muted px-2 py-1 text-xs">{active.formula}</code>
              </div>

              <ul className="space-y-3">
                <li className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
                  {word.toLowerCase()}
                </li>
                <li className="ml-4 border-l border-border pl-4">
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    {getCandidateLabel(safeIndex, locale)}
                  </div>
                  <ul className="ml-4 mt-3 space-y-2 border-l border-border pl-4">
                    {active.nodes.map((node) => (
                      <li
                        key={`${node.kind}-${node.text}-${node.start}-${node.end}`}
                        className="rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{node.text}</span>
                          <Badge variant={node.kind === "root" ? "default" : "secondary"}>
                            {getKindLabel(node.kind, locale)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            [{node.start}, {node.end})
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getMeaning(node, locale)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
