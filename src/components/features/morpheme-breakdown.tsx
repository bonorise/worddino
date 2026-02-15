import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalizedText } from "@/lib/i18n/content";
import type { LocaleCode, MorphemeItem } from "@/lib/types";

interface MorphemeBreakdownProps {
  locale: LocaleCode;
  title: string;
  fallback: string;
  decomposable: boolean;
  morphemes: MorphemeItem[];
}

const displayOrder: Record<"prefix" | "root" | "suffix", number> = {
  prefix: 1,
  root: 2,
  suffix: 3,
};

export function MorphemeBreakdown({
  locale,
  title,
  fallback,
  decomposable,
  morphemes,
}: MorphemeBreakdownProps) {
  const sortedMorphemes = [...morphemes].sort(
    (a, b) => displayOrder[a.kind] - displayOrder[b.kind],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {decomposable && sortedMorphemes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sortedMorphemes.map((item) => (
              <Badge
                key={`${item.kind}-${item.text}`}
                variant={item.kind === "root" ? "default" : "secondary"}
                className="cursor-help rounded-full px-3 py-1 text-sm"
                title={getLocalizedText(item.meaning, locale)}
              >
                {item.text}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{fallback}</p>
        )}
      </CardContent>
    </Card>
  );
}
