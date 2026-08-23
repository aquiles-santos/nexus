import { test, expect } from '@playwright/test'

async function clearEditor(page) {
  await page.locator('nexus-editor').evaluate((editor) => {
    editor.setContent('<p><br></p>')
  })
}

test('demo page loads the editor shell', async ({ page }) => {
  await page.goto('/demo/')

  await expect(page.getByRole('banner')).toContainText('Nexus')
  await expect(page.getByRole('button', { name: 'Share' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled()

  const editor = page.locator('nexus-editor')
  await expect(editor).toBeVisible()

  const content = editor.locator('[data-nexus-content]')
  await expect(content).toHaveAttribute('role', 'textbox')
  await expect(content).toHaveAttribute('aria-multiline', 'true')
  await expect(content.locator('h1')).toHaveText('The Architecture of Modern Content Systems')
})

test('toolbar applies bold formatting', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Hello world')
  await page.keyboard.press('Control+a')

  await page.getByRole('button', { name: 'Negrito' }).click()

  await expect(content.locator('strong')).toHaveText('Hello world')
})

test('keyboard shortcut applies italic', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Italic text')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+i')

  await expect(content.locator('em')).toHaveText('Italic text')
})

test('format block as heading', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Heading')
  await page.keyboard.press('Control+a')

  await page.getByRole('button', { name: 'Estilo do bloco' }).click()
  await page.getByRole('menuitemradio', { name: 'Título 1' }).click()

  await expect(content.locator('h1')).toHaveText('Heading')
  await expect(page.getByRole('button', { name: 'Estilo do bloco' })).toContainText('Título 1')
})

test('toolbar button deactivates after removing style', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  const italicButton = page.getByRole('button', { name: 'Itálico' })

  await content.click()
  await page.keyboard.type('teste teste teste')
  await page.keyboard.press('Control+a')
  await italicButton.click()

  await expect(content.locator('em')).toHaveText('teste teste teste')
  await expect(italicButton).toHaveAttribute('aria-pressed', 'true')

  await italicButton.click()

  await expect(content.locator('em')).toHaveCount(0)
  await expect(italicButton).toHaveAttribute('aria-pressed', 'false')
})

test('toolbar keeps active state for remaining styles', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  const boldButton = page.getByRole('button', { name: 'Negrito' })
  const italicButton = page.getByRole('button', { name: 'Itálico' })
  const underlineButton = page.getByRole('button', { name: 'Sublinhado' })

  await content.click()
  await page.keyboard.type('teste teste teste')
  await page.keyboard.press('Control+a')

  await boldButton.click()
  await italicButton.click()
  await underlineButton.click()

  await expect(boldButton).toHaveAttribute('aria-pressed', 'true')
  await expect(italicButton).toHaveAttribute('aria-pressed', 'true')
  await expect(underlineButton).toHaveAttribute('aria-pressed', 'true')

  await boldButton.click()

  await expect(content.locator('strong')).toHaveCount(0)
  await expect(content.locator('em')).toHaveCount(1)
  await expect(content.locator('u')).toHaveCount(1)
  await expect(boldButton).toHaveAttribute('aria-pressed', 'false')
  await expect(italicButton).toHaveAttribute('aria-pressed', 'true')
  await expect(underlineButton).toHaveAttribute('aria-pressed', 'true')
})

test('undo restores content', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Undo me')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+b')

  await expect(content.locator('strong')).toHaveText('Undo me')

  await page.keyboard.press('Control+z')

  await expect(content.locator('strong')).toHaveCount(0)
  await expect(content).toContainText('Undo me')
})

test('inserts a link from the modal', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Nexus')
  await page.keyboard.press('Control+a')
  await page.getByRole('button', { name: 'Link' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('URL').fill('https://example.com')
  await dialog.getByRole('button', { name: 'Insert' }).click()

  await expect(dialog).toBeHidden()
  await expect(content.locator('a')).toHaveAttribute('href', 'https://example.com')
  await expect(content.locator('a')).toHaveText('Nexus')
  await expect(content).toBeFocused()
})

test('shows an error when the link href is unsafe', async ({ page }) => {
  await page.goto('/demo/')
  await clearEditor(page)

  const content = page.locator('nexus-editor [data-nexus-content]')
  await content.click()
  await page.keyboard.type('Nexus')
  await page.keyboard.press('Control+a')
  await page.getByRole('button', { name: 'Link' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('URL').fill('javascript:alert(1)')
  await dialog.getByRole('button', { name: 'Insert' }).click()

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveText(/valid http, https, mailto, or tel URL/i)
  await expect(content.locator('a')).toHaveCount(0)
})

test('code view shows document source', async ({ page }) => {
  await page.goto('/demo/')

  await page.getByRole('button', { name: 'Code' }).click()

  const source = page.locator('[data-source-input]')
  await expect(source).toBeVisible()
  await expect(source).toHaveValue(/<h1>/)
  await expect(page.locator('nexus-editor [data-nexus-content]')).toBeHidden()
})
