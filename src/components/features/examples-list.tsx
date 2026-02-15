import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExampleItem, LocaleCode } from "@/lib/types";

interface ExamplesListProps {
  locale: LocaleCode;
  title: string;
  showTranslationLabel: string;
  hideTranslationLabel: string;
  examples: ExampleItem[];
}

export function ExamplesList({
  locale,
  title,
  showTranslationLabel,
  hideTranslationLabel,
  examples,
}: ExamplesListProps) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {examples.map((example, index) => (
          <details key={`${example.en}-${index}`} className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
              {example.en}
              <span className="ml-2 text-xs text-muted-foreground">
                ({showTranslationLabel} / {hideTranslationLabel})
              </span>
            </summary>
            <p className="pt-2 text-sm text-muted-foreground">
              {locale === "zh-CN" ? example["zh-CN"] : example["zh-CN"]}
            </p>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
