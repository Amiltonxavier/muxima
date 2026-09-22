import { test as setup } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
	mkdirSync("e2e/.auth", { recursive: true });

	await page.goto("/login");

	await page.getByLabel("Email").fill("admin@muxima.ao");
	await page.getByLabel("Password").fill("admin123");
	await page.getByRole("button", { name: "Entrar" }).click();

	await page.waitForURL("**/dashboard", { timeout: 15_000 });

	const cookies = await page.context().cookies();
	const storageState = {
		cookies,
		origins: [
			{
				origin: page.url(),
				storage: await page.evaluate(() => {
					const items: { name: string; value: string }[] = [];
					for (let i = 0; i < localStorage.length; i++) {
						const key = localStorage.key(i);
						if (key) {
							items.push({ name: key, value: localStorage.getItem(key) || "" });
						}
					}
					return items;
				}),
			},
		],
	};

	writeFileSync(authFile, JSON.stringify(storageState, null, 2));
});
