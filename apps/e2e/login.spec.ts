import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("Valid email & password login - redirected home, Sanctum token stored in session", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL ?? "";
    const password = process.env.E2E_USER_PASSWORD ?? "";

    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run this login test.");

    await page.goto("/login");

    await page.getByLabel("Username or Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.locator("form").getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page).toHaveURL(/\/shop(?:\?|$)/, { timeout: 30_000 });

    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.ok()).toBeTruthy();

    const session = await sessionResponse.json();
    expect(session?.user?.accessToken).toEqual(expect.any(String));
    expect(session.user.accessToken.length).toBeGreaterThan(0);
  });

  test("Empty fields - inline validation", async ({ page }) => {
    await page.goto("/login");

    await page.locator("form").getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByText("Username or Email is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
    await expect(page.locator("#login-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#login-password")).toHaveAttribute("aria-invalid", "true");
  });
});
