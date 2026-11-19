'use strict'

const fs = require('fs').promises
const path = require('path')
const puppeteer = require('puppeteer-core')
const config = require('../config')

const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }

const maxImageBytes = 10 * 1024 * 1024
const maxUploadBytes = 20 * 1024 * 1024

async function inlineUploads (tokens, serverURL, uploadsPath, budget) {
  const prefix = '/uploads/'
  for (const token of tokens) {
    if (token.children) await inlineUploads(token.children, serverURL, uploadsPath, budget)
    if (token.type !== 'image') continue
    const src = token.attrGet('src')
    let filename
    try {
      const base = new URL(serverURL + '/')
      const url = new URL(src, base)
      const root = base.pathname.replace(/\/$/, '') + prefix
      if (url.origin !== base.origin || !url.pathname.startsWith(root)) continue
      filename = decodeURIComponent(url.pathname.slice(root.length))
    } catch (error) { continue }
    if (!/^[\w.-]+$/.test(filename) || filename === '.' || filename === '..') continue
    const type = imageTypes[path.extname(filename).toLowerCase()]
    if (!type) continue
    let file
    try {
      file = await fs.open(path.join(uploadsPath, filename), require('fs').constants.O_RDONLY | require('fs').constants.O_NOFOLLOW | require('fs').constants.O_NONBLOCK)
      const stat = await file.stat()
      if (!stat.isFile() || stat.size > maxImageBytes || stat.size > budget.remaining) continue
      const buffer = Buffer.alloc(stat.size + 1)
      let offset = 0
      while (offset < buffer.length) {
        const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset)
        if (!bytesRead) break
        offset += bytesRead
      }
      if (offset > stat.size) continue
      const data = buffer.subarray(0, offset)
      budget.remaining -= data.length
      token.attrSet('src', 'data:' + type + ';base64,' + data.toString('base64'))
    } catch (error) {
      // Missing or unsafe uploads remain blocked by the renderer.
    } finally {
      if (file) await file.close()
    }
  }
}
const markdown = require('markdown-it')({ html: false, linkify: true })

async function renderHTML (content, serverURL = config.serverURL, uploadsPath = config.uploadsPath) {
  const env = {}
  const tokens = markdown.parse(content, env)
  await inlineUploads(tokens, serverURL, uploadsPath, { remaining: maxUploadBytes })
  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">' +
    '<style>body{font:14px/1.6 sans-serif;color:#24292f;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f6f8fa;padding:12px}code{font-family:monospace}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}blockquote{border-left:4px solid #ccc;padding-left:12px}a{color:#0969da}</style></head><body>' +
    markdown.renderer.render(tokens, markdown.options, env) + '</body></html>'
}

class PDFBusyError extends Error {}

function limitRendering (render, limit = 2) {
  let active = 0
  return async function (...args) {
    if (active >= limit) throw new PDFBusyError('PDF renderer is busy')
    active++
    try {
      return await render(...args)
    } finally {
      active--
    }
  }
}

async function renderPDF (content, serverURL) {
  const executablePath = process.env.CMD_CHROMIUM_EXECUTABLE_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/chromium')
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 30000, args: ['--disable-dev-shm-usage'] })
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', request => {
      const allowed = request.url().startsWith('data:') || request.url() === 'about:blank'
      return (allowed ? request.continue() : request.abort()).catch(() => {})
    })
    await page.setContent(await renderHTML(content, serverURL), { waitUntil: 'load', timeout: 30000 })
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, timeout: 30000, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } }))
  } finally {
    await browser.close()
  }
}

module.exports = { renderHTML, renderPDF: limitRendering(renderPDF), limitRendering, PDFBusyError }
