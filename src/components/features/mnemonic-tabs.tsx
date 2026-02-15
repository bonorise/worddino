"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LocaleCode, MnemonicType, WordDetail } from "@/lib/types";

interface MnemonicTabsProps {
  locale: LocaleCode;
  word: WordDetail;
  labels: {
    title: string;
    recommended: string;
    homophone: string;
    image: string;
    story: string;
    imagePrompt: string;
    copyPrompt: string;
  };
}

const orderedTypes: MnemonicType[] = ["homophone", "image", "story"];

export function MnemonicTabs({ locale, word, labels }: MnemonicTabsProps) {
  const labelsByType = useMemo(
    () => ({
      homophone: labels.homophone,
      image: labels.image,
      story: labels.story,
    }),
    [labels.homophone, labels.image, labels.story],
  );

  const contentByType = useMemo(() => {
    const map = new Map<MnemonicType, string>();
    for (const item of word.mnemonics.items) {
      map.set(item.type, locale === "zh-CN" ? item["zh-CN"] : item.en);
    }
    return map;
  }, [locale, word.mnemonics.items]);

  const availableTypes = orderedTypes.filter((type) => contentByType.has(type));
  const defaultType = contentByType.has(word.mnemonics.recommended)
    ? word.mnemonics.recommended
    : availableTypes[0];

  if (!defaultType) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{labels.title}</CardTitle>
          <Badge variant="secondary">
            {labelsByType[word.mnemonics.recommended]} · {labels.recommended}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultType}>
          <TabsList className="w-full justify-start">
            {availableTypes.map((type) => (
              <TabsTrigger key={type} value={type}>
                {labelsByType[type]}
              </TabsTrigger>
            ))}
          </TabsList>
          {availableTypes.map((type) => (
            <TabsContent key={type} value={type} className="space-y-3">
              <p className="leading-7 text-foreground">{contentByType.get(type)}</p>
              {type === "image" && word.imagePrompt ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {labels.imagePrompt}
                  </div>
                  <p className="text-sm">{word.imagePrompt}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={async () => {
                      await navigator.clipboard.writeText(word.imagePrompt ?? "");
                      toast.success(
                        locale === "zh-CN" ? "提示词已复制" : "Prompt copied",
                      );
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    {labels.copyPrompt}
                  </Button>
                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
