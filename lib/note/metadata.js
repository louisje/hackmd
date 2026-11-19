'use strict'

const yaml = require('js-yaml')

module.exports = function extractMeta (content) {
  const fallback = { markdown: content, meta: {} }
  if (typeof content !== 'string') return fallback
  const opening = /^---[ \t]*\r?\n/.exec(content)
  if (!opening) return fallback
  const closing = /^(?:---|\.\.\.)[ \t]*\r?$/gm
  closing.lastIndex = opening[0].length
  const end = closing.exec(content)
  if (!end) return fallback
  try {
    const meta = yaml.safeLoad(content.slice(opening[0].length, end.index))
    return {
      markdown: content.slice(closing.lastIndex),
      meta: meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {}
    }
  } catch (err) {
    return fallback
  }
}
