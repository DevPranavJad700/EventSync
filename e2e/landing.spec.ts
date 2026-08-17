import { test, expect } from "@playwright/test";

test.describe("Landing Page & Protected Routes E2E", () => {
  test("renders marketing landing page and brand elements", async ({ page }) => {
    await page.goto("/");

    // Verify brand heading
    await expect(page.locator("h1")).toContainText("Ship your SaaS faster with EventSync");

    // Verify navigation links
    const signInButton = page.getByRole("link", { name: "Sign in" });
    await expect(signInButton).toBeVisible();

    const getStartedButton = page.getByRole("link", { name: "Get started" });
    await expect(getStartedButton).toBeVisible();
  });

  test("redirects unauthenticated users attempting to access /dashboard to sign-in page", async ({ page }) => {
    await page.goto("/dashboard");

    // Clerk middleware should redirect unauthenticated request to /sign-in
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });
});
