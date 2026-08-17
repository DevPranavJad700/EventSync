import { test, expect } from "@playwright/test";

test.describe("RBAC & Webhook API Security Boundaries E2E", () => {
  test("GET /api/events rejects unauthenticated API request with 401 Unauthorized", async ({ request }) => {
    const response = await request.get("/api/events");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/webhooks/clerk rejects request without Svix headers with 400 Bad Request", async ({ request }) => {
    const response = await request.post("/api/webhooks/clerk", {
      data: { type: "user.created", data: {} },
    });

    expect(response.status()).toBe(400);
    const text = await response.text();
    expect(text).toContain("Missing Svix headers");
  });

  test("unauthenticated access to /dashboard/admin/webhooks redirects to sign-in page", async ({ page }) => {
    await page.goto("/dashboard/admin/webhooks");

    // Clerk middleware should redirect unauthenticated request to /sign-in
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });
});
