import type { AnalyzeErrorCode } from "@/types";

interface AnalyzeServiceErrorOptions {
  code: AnalyzeErrorCode;
  name: string;
  status: number;
  publicMessage: string;
  retryable: boolean;
  upstreamStatus?: number;
  cause?: unknown;
}

export class AnalyzeServiceError extends Error {
  code: AnalyzeErrorCode;
  status: number;
  publicMessage: string;
  retryable: boolean;
  upstreamStatus?: number;
  override cause?: unknown;

  constructor(options: AnalyzeServiceErrorOptions) {
    super(options.publicMessage);
    this.name = options.name;
    this.code = options.code;
    this.status = options.status;
    this.publicMessage = options.publicMessage;
    this.retryable = options.retryable;
    this.upstreamStatus = options.upstreamStatus;
    this.cause = options.cause;
  }
}

export class AnalyzeConfigError extends AnalyzeServiceError {
  constructor(cause?: unknown) {
    super({
      name: "AnalyzeConfigError",
      code: "AI_CONFIG_ERROR",
      status: 500,
      publicMessage: "AI 服务配置异常，暂时无法分析",
      retryable: false,
      cause,
    });
  }
}

export class AnalyzeAuthError extends AnalyzeServiceError {
  constructor(upstreamStatus?: number, cause?: unknown) {
    super({
      name: "AnalyzeAuthError",
      code: "AI_AUTH_ERROR",
      status: 503,
      publicMessage: "AI 服务认证异常，请稍后再试",
      retryable: false,
      upstreamStatus,
      cause,
    });
  }
}

export class AnalyzeRateLimitError extends AnalyzeServiceError {
  constructor(upstreamStatus?: number, cause?: unknown) {
    super({
      name: "AnalyzeRateLimitError",
      code: "AI_RATE_LIMITED",
      status: 429,
      publicMessage: "当前请求较多，请稍后重试",
      retryable: true,
      upstreamStatus,
      cause,
    });
  }
}

export class AnalyzeUpstreamError extends AnalyzeServiceError {
  constructor(upstreamStatus?: number, cause?: unknown) {
    super({
      name: "AnalyzeUpstreamError",
      code: "AI_UPSTREAM_ERROR",
      status: 503,
      publicMessage: "AI 服务暂时不可用，请稍后重试",
      retryable: true,
      upstreamStatus,
      cause,
    });
  }
}

export class AnalyzeResponseInvalidError extends AnalyzeServiceError {
  constructor(upstreamStatus?: number, cause?: unknown) {
    super({
      name: "AnalyzeResponseInvalidError",
      code: "AI_RESPONSE_INVALID",
      status: 502,
      publicMessage: "AI 返回结果异常，请稍后重试",
      retryable: true,
      upstreamStatus,
      cause,
    });
  }
}

export function isAnalyzeServiceError(error: unknown): error is AnalyzeServiceError {
  return error instanceof AnalyzeServiceError;
}
