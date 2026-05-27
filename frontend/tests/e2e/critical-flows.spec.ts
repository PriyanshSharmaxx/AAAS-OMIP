import { test, expect } from "@playwright/test";

const email = `omip-e2e-${Date.now()}@example.com`;
const password = "Password1";

test.describe("Omip critical flows", () => {
  test("signup and login", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/username/i).fill("e2e-user");
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign up|create account/i }).click();

    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).click();
  });

  test("create agent", async ({ page }) => {
    await page.goto("/agent-space");
    await expect(page).toHaveURL(/agent-space/);
  });

  test("run agent", async ({ page }) => {
    await page.goto("/explore");
    await expect(page).toHaveURL(/explore/);
  });

  test("permissions grant", async ({ page }) => {
    await page.goto("/run/test-agent");
    await expect(page).toHaveURL(/run/);
  });

  test("team invite", async ({ page }) => {
    await page.goto("/team");
    await expect(page).toHaveURL(/team/);
  });

  test("marketplace subscribe", async ({ page }) => {
    await page.goto("/explore");
    await expect(page).toHaveURL(/explore/);
  });
});
