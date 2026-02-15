import type { LocaleCode, LocalizedText } from "@/lib/types";

export function getLocalizedText(value: LocalizedText, locale: LocaleCode): string {
  if (locale === "zh-CN") {
    return value["zh-CN"] || value.en;
  }
  return value.en || value["zh-CN"];
}
