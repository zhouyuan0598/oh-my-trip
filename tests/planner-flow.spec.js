import { expect, test } from "@playwright/test";

test.describe("planner MVP flow", () => {
  test("supports generate, refine, publish, and home replay flow", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByTestId("planner-cta")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/home.png", fullPage: true });

    await page.getByTestId("planner-cta").click();
    await expect(page).toHaveURL(/\/planner\/$/);

    await page.getByTestId("generate-button").click();
    await expect(page.locator("#planner-error")).toContainText("请先确认目的地和出发地");

    await page.locator('[data-template="weekend-city"]').click();
    await expect(page.locator('[name="destination"]')).toHaveValue("杭州");

    await page.getByTestId("destination-input").fill("杭州");
    await page.locator('[name="origin"]').fill("上海");
    await page.locator('[name="days"]').fill("2");
    await page.locator('[name="partySize"]').fill("2");
    await page.locator('[name="budgetMin"]').fill("3200");
    await page.locator('[name="budgetMax"]').fill("4200");
    await page.locator('[name="travelDate"]').fill("2026-05-18");
    await page.locator('[name="riskPreference"]').selectOption("cautious");

    await page.getByTestId("generate-button").click();
    await expect(page.locator("#planner-status")).toContainText("已完成必填信息");
    await page.getByTestId("generate-button").click();
    await expect(page.locator(".option-card")).toHaveCount(3, { timeout: 30000 });
    await expect(page.locator("#source-brief")).toContainText("天气明细");
    await expect(page.locator(".option-card__transport-detail").first()).toBeVisible();
    await expect(page.locator(".option-card").first()).toContainText("推荐景点");

    await page.screenshot({ path: "test-results/screenshots/planner-results.png", fullPage: true });

    await page.getByTestId("avoid-night-driving").check();
    await page.locator("#refine-button").click();
    await expect(page.locator(".option-card")).toHaveCount(3, { timeout: 30000 });
    await expect(page.locator("#planner-status")).toContainText("已生成 3 个候选方案", { timeout: 30000 });

    await page.getByTestId("select-route-a").click();
    await expect(page.getByTestId("selection-banner")).toContainText("已选择");
    await expect(page.locator("#option-diff")).toContainText("差异提示");

    await page.getByTestId("publish-button").click();
    await expect(page.locator("#publish-confirm")).toBeVisible();
    await page.getByTestId("confirm-publish-button").click();
    await expect(page.locator("#publish-success")).toBeVisible();
    await page.getByTestId("view-published-guide").click();
    await expect(page).toHaveURL(/\/guides\/generated\/\?trip=/);
    await expect(page.locator(".guide-section--planning")).toBeVisible();

    await page.screenshot({ path: "test-results/screenshots/generated-guide.png", fullPage: true });

    await page.locator(".guide-back").click();
    await expect(page).toHaveURL("/");
    await expect(page.locator(".trip-card").first().locator(".trip-card__meta")).toContainText("规划生成");
  });
});
