import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    console.warn('E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping auth setup');
    // Create empty storage state so tests can still run (unauthenticated)
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
