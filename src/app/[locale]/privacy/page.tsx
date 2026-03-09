import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>{t("content")}</p>
      </CardContent>
    </Card>
  );
}
