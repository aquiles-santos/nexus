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

test('toolbar stays visible when document content grows', async ({ page }) => {
  await page.goto('/demo/')

  const longContent = Array.from({ length: 80 }, (_, index) => `<p>Paragraph ${index + 1}</p>`).join('')
  await page.locator('nexus-editor').evaluate((editor, html) => {
    editor.setContent(html)
  }, longContent)

  const scroller = page.locator('nexus-editor [data-nexus-scroller]')
  const toolbar = page.getByRole('toolbar')

  const scrollMetrics = await scroller.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
    paddingBottom: Number.parseFloat(getComputedStyle(element).paddingBottom),
  }))
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)
  expect(scrollMetrics.paddingTop).toBeGreaterThan(0)
  expect(scrollMetrics.paddingBottom).toBeGreaterThan(0)

  await expect(toolbar).toBeInViewport()

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  await expect(toolbar).toBeInViewport()
})

test('focus border stays inside the scroller when content overflows', async ({ page }) => {
  await page.goto('/demo/')

  const longContent = Array.from({ length: 80 }, (_, index) => `<p>Paragraph ${index + 1}</p>`).join('')
  await page.locator('nexus-editor').evaluate((editor, html) => {
    editor.setContent(html)
  }, longContent)

  const scroller = page.locator('nexus-editor [data-nexus-scroller]')
  const content = page.locator('nexus-editor [data-nexus-content]')

  await content.click()

  const edgesVisibleAtTop = await scroller.evaluate((element) => {
    element.scrollTop = 0

    const content = element.querySelector('[data-nexus-content]')
    if (!content) {
      return false
    }

    const scrollerRect = element.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const paddingTop = Number.parseFloat(getComputedStyle(element).paddingTop)
    const borderColor = getComputedStyle(content).borderTopColor

    return (
      contentRect.top >= scrollerRect.top + paddingTop - 1
      && borderColor !== 'rgba(0, 0, 0, 0)'
      && borderColor !== 'transparent'
    )
  })

  const edgesVisibleAtBottom = await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight

    const content = element.querySelector('[data-nexus-content]')
    if (!content) {
      return false
    }

    const scrollerRect = element.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const paddingBottom = Number.parseFloat(getComputedStyle(element).paddingBottom)
    const borderColor = getComputedStyle(content).borderBottomColor

    return (
      contentRect.bottom <= scrollerRect.bottom - paddingBottom + 1
      && borderColor !== 'rgba(0, 0, 0, 0)'
      && borderColor !== 'transparent'
    )
  })

  expect(edgesVisibleAtTop).toBe(true)
  expect(edgesVisibleAtBottom).toBe(true)
})

test('demo toolbar follows the configured tool order', async ({ page }) => {
  await page.goto('/demo/')

  const order = await page.locator('nexus-editor').evaluate((editor) =>
    [...editor.toolbar.shadowRoot.querySelectorAll('[data-toolbar-item]')].map((node) =>
      node.getAttribute('data-toolbar-item'),
    ),
  )

  expect(order.indexOf('undo')).toBeLessThan(order.indexOf('formatBlock'))
  expect(order.indexOf('formatBlock')).toBeLessThan(order.indexOf('bold'))
  expect(order.indexOf('bold')).toBeLessThan(order.indexOf('insertLink'))
  expect(order.indexOf('insertLink')).toBeLessThan(order.indexOf('toggleSource'))
})

test('host can set a custom editor height', async ({ page }) => {
  await page.goto('/demo/')

  const metrics = await page.locator('nexus-editor').evaluate((editor) => {
    editor.configure({ height: 320 })
    return {
      config: editor.config.height,
      css: editor.style.getPropertyValue('--nexus-editor-height'),
      offset: Math.round(editor.getBoundingClientRect().height),
    }
  })

  expect(metrics.config).toBe('320px')
  expect(metrics.css).toBe('320px')
  expect(metrics.offset).toBe(320)
})
