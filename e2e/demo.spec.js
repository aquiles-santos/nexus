import { test, expect } from '@playwright/test'

test('demo page loads and renders nexus-editor', async ({ page }) => {
  await page.goto('/demo/')

  const editor = page.locator('nexus-editor')
  await expect(editor).toBeVisible()
  await expect(editor.locator('[data-nexus-content]')).toHaveAttribute('role', 'textbox')
})
