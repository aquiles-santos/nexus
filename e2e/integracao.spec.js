import { test, expect } from '@playwright/test'

test('integration demo mounts a configured editor', async ({ page }) => {
  await page.goto('/demo/integracao/')

  await expect(page.getByRole('heading', { name: 'Nova publicação' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Integração' })).toHaveAttribute('aria-current', 'page')

  const editor = page.locator('nexus-editor')
  await expect(editor).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Conteúdo' })).toContainText('setContent')

  const metrics = await editor.evaluate((element) => ({
    height: element.config.height,
    toolbar: element.config.toolbar,
    offset: Math.round(element.getBoundingClientRect().height),
  }))

  expect(metrics.height).toBe('400px')
  expect(metrics.offset).toBe(400)
  expect(metrics.toolbar).toEqual([
    'undo',
    'redo',
    '|',
    'formatBlock',
    '|',
    'bold',
    'italic',
    '|',
    'insertUnorderedList',
    'insertOrderedList',
    '|',
    'insertLink',
  ])

  await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Itálico' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sublinhado' })).toHaveCount(0)
})

test('integration demo applies bold from the host-configured toolbar', async ({ page }) => {
  await page.goto('/demo/integracao/')

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.type('Hello host')
  await page.keyboard.press('Control+a')
  await page.getByRole('button', { name: 'Negrito' }).click()

  await expect(content.locator('strong')).toHaveText('Hello host')
})

test('playground links to the integration demo', async ({ page }) => {
  await page.goto('/demo/')

  await page.getByRole('navigation', { name: 'Demos' }).getByRole('link', { name: 'Integração' }).click()
  await expect(page).toHaveURL(/\/demo\/integracao\/?$/)
  await expect(page.getByRole('heading', { name: 'Nova publicação' })).toBeVisible()
})

test('integration editor scrolls when content exceeds the configured height', async ({ page }) => {
  await page.goto('/demo/integracao/')

  const longContent = Array.from({ length: 80 }, (_, index) => `<p>Paragraph ${index + 1}</p>`).join('')
  await page.locator('nexus-editor').evaluate((editor, html) => {
    editor.setContent(html)
  }, longContent)

  const scroller = page.locator('nexus-editor [data-nexus-scroller]')
  const toolbar = page.getByRole('toolbar')

  const scrollMetrics = await scroller.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }))

  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)

  await expect(toolbar).toBeInViewport()

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  const scrolled = await scroller.evaluate((element) => element.scrollTop > 0)
  expect(scrolled).toBe(true)
  await expect(toolbar).toBeInViewport()
})
