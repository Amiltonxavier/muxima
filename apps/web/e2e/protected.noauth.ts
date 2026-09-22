import { expect, test } from "@playwright/test";

test("redirects unauthenticated user to login", async ({ page }) => {
	await page.goto("/dashboard");

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole("heading", { name: "Bem-vindo novamente" })).toBeVisible();
});
