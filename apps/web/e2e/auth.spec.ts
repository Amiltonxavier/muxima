import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
	test("loads the login page", async ({ page }) => {
		await page.goto("/login");

		await expect(
			page.getByRole("heading", { name: "Bem-vindo novamente" }),
		).toBeVisible();
		await expect(
			page.getByText("Entre na sua conta para continuar"),
		).toBeVisible();
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Password")).toBeVisible();
		await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
	});

	test("shows validation errors for empty fields", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Email").clear();
		await page.getByLabel("Password").clear();
		await page.getByRole("button", { name: "Entrar" }).click();

		await expect(page.getByText("Email é obrigatório")).toBeVisible();
		await expect(page.getByText("Palavra-passe é obrigatória")).toBeVisible();
	});

	test("navigates to dashboard after login", async ({ page }) => {
		await page.goto("/dashboard");

		await expect(page).toHaveURL(/\/dashboard/);
	});
});
