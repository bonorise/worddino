import type { AnalyzeErrorCode, AnalyzeErrorResponse } from "@/types";

const analyzeErrorCodes: AnalyzeErrorCode[] = [
  "INVALID_REQUEST",
  "AI_CONFIG_ERROR",
  "AI_AUTH_ERROR",
  "AI_RATE_LIMITED",
  "AI_UPSTREAM_ERROR",
  "AI_RESPONSE_INVALID",
];

export function isAnalyzeErrorCode(code: string): code is AnalyzeErrorCode {
  return analyzeErrorCodes.includes(code as AnalyzeErrorCode);
}

export function getLocalizedAnalyzeErrorMessage(
  error: AnalyzeErrorResponse,
  translate: (key: string) => string,
): string {
  if (isAnalyzeErrorCode(error.code)) {
    return translate(`errors.${error.code}`);
  }

  return error.message;
}
