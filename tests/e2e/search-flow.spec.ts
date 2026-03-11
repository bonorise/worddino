import { expect, test } from "@playwright/test";

test("zh-CN search flow renders gemini analysis payload", async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          word: "transport",
          normalizedWord: "transport",
          locale: "zh-CN",
          decomposable: true,
          explanation: "transport 指把人或物从一个地方运到另一个地方。",
          scene: "想象一辆卡车穿过桥梁，把箱子运到远方。",
          formula: "跨越 + 搬运 = 运输",
          hook: "记住 transport，就是把东西带着跨过去。",
          morphemes: [
            {
              text: "trans",
              kind: "prefix",
              meaning: "穿过、跨越",
            },
            {
              text: "port",
              kind: "root",
              meaning: "搬运、携带",
            },
          ],
          mnemonics: [
            {
              type: "story",
              title: "故事助记",
              content: "想象一辆卡车穿过山谷，把货物运到远方。",
            },
          ],
          recommendedType: "story",
          examples: ["The truck can transport fruit to the city."],
          familyWords: ["portable", "export", "import"],
          source: "gemini",
        },
      }),
    });
  });

  await page.goto("/zh-CN");
  await page.getByPlaceholder("输入英文单词，例如 transport").fill("transport");
  await page.getByRole("button", { name: "开始挖掘" }).click();

  await expect(page).toHaveURL(/\/zh-CN\/word\/transport$/);
  await expect(page.getByText("transport 指把人或物从一个地方运到另一个地方。")).toBeVisible();
  await expect(page.getByText("记忆锚点")).toBeVisible();
  await expect(page.getByText("想象一辆卡车穿过桥梁，把箱子运到远方。")).toBeVisible();
  await expect(page.getByText("跨越 + 搬运 = 运输")).toBeVisible();
  await expect(page.getByText("记住 transport，就是把东西带着跨过去。")).toBeVisible();
  await expect(page.getByText("故事助记")).toBeVisible();
  await expect(page.getByText("portable")).toBeVisible();
});
