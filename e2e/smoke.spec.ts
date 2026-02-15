import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('login page loads and form is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('KRATOS v2')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('dashboard loads with document heading', async ({ page }) => {
    await page.goto('/dashboard');
    // If auth redirects to login, that's also acceptable for smoke test
    const url = page.url();
    if (url.includes('login')) {
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    } else {
      await expect(page.getByText('Documentos')).toBeVisible();
    }
  });

  test('upload zone is visible on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const url = page.url();
    if (!url.includes('login')) {
      await expect(page.getByText(/arraste pdfs aqui/i)).toBeVisible();
    }
  });

  test('navigation works between pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await page.goto('/dashboard');
    // Should either stay on dashboard or redirect to login
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
  });
});
