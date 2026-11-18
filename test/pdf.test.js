/* eslint-env mocha */
'use strict'

const assert = require('assert')
const fs = require('fs').promises
const os = require('os')
const path = require('path')
const { renderHTML, limitRendering, PDFBusyError } = require('../lib/note/pdf')

describe('PDF rendering', function () {
  let root, uploads
  const serverURL = 'https://example.test'
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'hackmd-pdf-'))
    uploads = path.join(root, 'uploads')
    await fs.mkdir(uploads)
    await fs.writeFile(path.join(uploads, 'image.png'), 'image bytes')
    await fs.writeFile(path.join(root, 'secret.png'), 'secret bytes')
    await fs.symlink(path.join(root, 'secret.png'), path.join(uploads, 'link.png'))
  })
  afterEach(async function () { await fs.rm(root, { recursive: true, force: true }) })

  it('renders Markdown without executable HTML', async function () {
    const html = await renderHTML('# 中文\n\n**bold**\n\n<script>alert(1)</script>', serverURL, uploads)
    assert(html.includes('<strong>bold</strong>'))
    assert(html.includes('中文'))
    assert(!html.includes('<script>'))
    assert(html.includes("default-src 'none'"))
  })
  it('embeds same-origin raster uploads', async function () {
    for (const src of ['/uploads/image.png', serverURL + '/uploads/image.png']) {
      const html = await renderHTML('![image](' + src + ')', serverURL, uploads)
      assert(html.includes('data:image/png;base64,' + Buffer.from('image bytes').toString('base64')))
    }
  })
  it('supports a configured URL prefix', async function () {
    const html = await renderHTML('![image](/notes/uploads/image.png)', serverURL + '/notes', uploads)
    assert(html.includes('data:image/png;base64,'))
  })
  it('does not embed external, traversal, symlink or missing files', async function () {
    for (const src of ['https://other.test/uploads/image.png', '/uploads/../secret.png', '/uploads/%2e%2e%2fsecret.png', '/uploads/link.png', '/uploads/missing.png', '/uploads/image.svg']) {
      const html = await renderHTML('![image](' + src + ')', serverURL, uploads)
      assert(!html.includes('data:image/png;base64,'), src)
      assert(!html.includes(Buffer.from('secret bytes').toString('base64')), src)
    }
  })
  it('rejects oversized raster uploads', async function () {
    await fs.writeFile(path.join(uploads, 'large.png'), Buffer.alloc(10 * 1024 * 1024 + 1))
    const html = await renderHTML('![image](/uploads/large.png)', serverURL, uploads)
    assert(!html.includes('data:image/png;base64,'))
  })
  it('rejects excess concurrent renders and releases completed slots', async function () {
    const pending = []
    const render = limitRendering(() => new Promise(resolve => pending.push(resolve)))
    const first = render()
    const second = render()
    await assert.rejects(render(), PDFBusyError)
    pending[0]('first')
    assert.strictEqual(await first, 'first')
    const third = render()
    pending[1]('second')
    pending[2]('third')
    await Promise.all([second, third])
  })
  it('releases a rendering slot after failure', async function () {
    const render = limitRendering(async () => { throw new Error('failed') }, 1)
    await assert.rejects(render(), /failed/)
    await assert.rejects(render(), /failed/)
  })
  it('limits the total embedded upload size', async function () {
    await fs.writeFile(path.join(uploads, 'large.png'), Buffer.alloc(7 * 1024 * 1024))
    const html = await renderHTML(Array(3).fill('![image](/uploads/large.png)').join('\n\n'), serverURL, uploads)
    assert.strictEqual((html.match(/data:image\/png;base64,/g) || []).length, 2)
  })
})
