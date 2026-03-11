// @vitest-environment jsdom

import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const themeState = vi.hoisted(() => ({
  resolvedTheme: undefined as string | undefined,
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

import { ThemeToggle } from "@/components/layout/theme-toggle";

describe("ThemeToggle", () => {
  afterEach(() => {
    themeState.resolvedTheme = undefined;
    themeState.setTheme.mockReset();
    document.body.innerHTML = "";
  });

  it("hydrates without mismatch when client theme resolves to dark", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    themeState.resolvedTheme = undefined;
    const serverHtml = renderToString(createElement(ThemeToggle));
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    const recoverableErrors: string[] = [];

    themeState.resolvedTheme = "dark";

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, createElement(ThemeToggle), {
        onRecoverableError: (error) => {
          recoverableErrors.push(error.message);
        },
      });
    });

    expect(recoverableErrors).toEqual([]);

    await act(async () => {
      root?.unmount();
    });
  });
});
