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
    'underline',
    '|',
    'insertUnorderedList',
    'insertOrderedList',
    '|',
    'insertLink',
    'insertImage',
    '|',
    'toggleSource',
  ])

  await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Itálico' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sublinhado' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lista com marcadores' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lista numerada' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Link' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imagem' })).toBeVisible()
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

  const lastParagraphInsidePaper = await page.locator('nexus-editor').evaluate((element) => {
    const content = element.querySelector('[data-nexus-content]')
    const last = content.querySelector('p:last-of-type')
    const contentBox = content.getBoundingClientRect()
    const lastBox = last.getBoundingClientRect()
    return lastBox.bottom <= contentBox.bottom + 2
  })
  expect(lastParagraphInsidePaper).toBe(true)

  await expect(toolbar).toBeInViewport()

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  const scrolled = await scroller.evaluate((element) => element.scrollTop > 0)
  expect(scrolled).toBe(true)
  await expect(toolbar).toBeInViewport()
})

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('integration writing area fills the editor instead of shrinking to the placeholder', async ({ page }) => {
  await page.goto('/demo/integracao/')

  await page.locator('nexus-editor').evaluate((editor) => {
    editor.setContent('<p><br></p>')
  })

  const metrics = await page.locator('nexus-editor').evaluate((element) => {
    const scroller = element.querySelector('[data-nexus-scroller]')
    const content = element.querySelector('[data-nexus-content]')
    const scrollerBox = scroller.getBoundingClientRect()
    const contentBox = content.getBoundingClientRect()
    return {
      contentWidth: contentBox.width,
      scrollerWidth: scrollerBox.width,
      contentHeight: contentBox.height,
      scrollerHeight: scrollerBox.height,
    }
  })

  expect(metrics.contentWidth).toBeGreaterThan(metrics.scrollerWidth * 0.7)
  expect(metrics.contentHeight).toBeGreaterThan(metrics.scrollerHeight * 0.7)
})

test('integration demo renders a local image inside the editor', async ({ page }) => {
  await page.goto('/demo/integracao/')

  const editor = page.locator('nexus-editor')
  const content = editor.locator('[data-nexus-content]')
  await content.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Imagem' }).click(),
  ])

  await fileChooser.setFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: MINIMAL_PNG,
  })

  const image = content.locator('img')
  await expect(image).toBeVisible()
  await expect(content).not.toHaveAttribute('data-empty')
  await expect(image).toHaveJSProperty('naturalWidth', 1)

  const contained = await editor.evaluate((element) => {
    const img = element.querySelector('[data-nexus-content] img')
    const editorBox = element.getBoundingClientRect()
    const imageBox = img.getBoundingClientRect()
    return (
      imageBox.left >= editorBox.left - 1
      && imageBox.right <= editorBox.right + 1
    )
  })
  expect(contained).toBe(true)
})

test('tall images stay within the writing area while the editor scrolls', async ({ page }) => {
  await page.goto('/demo/integracao/')

  await page.locator('nexus-editor').evaluate(async (editor) => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 900
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    const url = URL.createObjectURL(blob)
    editor.setContent(`<p><img src="${url}" alt="estatua"></p>`)
  })

  const editor = page.locator('nexus-editor')
  const image = editor.locator('[data-nexus-content] img')
  await expect(image).toBeVisible()
  await expect(image).toHaveJSProperty('naturalHeight', 900)

  const metrics = await editor.evaluate((element) => {
    const img = element.querySelector('[data-nexus-content] img')
    const content = element.querySelector('[data-nexus-content]')
    const scroller = element.querySelector('[data-nexus-scroller]')
    const imageBox = img.getBoundingClientRect()
    const contentBox = content.getBoundingClientRect()
    return {
      editorHeight: Math.round(element.getBoundingClientRect().height),
      imageWidth: imageBox.width,
      imageBottom: imageBox.bottom,
      contentWidth: contentBox.width,
      contentBottom: contentBox.bottom,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    }
  })

  expect(metrics.editorHeight).toBe(400)
  expect(metrics.imageWidth).toBeLessThanOrEqual(metrics.contentWidth + 1)
  expect(metrics.imageBottom).toBeLessThanOrEqual(metrics.contentBottom + 1)
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
})

