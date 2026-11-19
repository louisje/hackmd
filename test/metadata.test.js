/* eslint-env mocha */
'use strict'

const assert = require('assert').strict
const extractMeta = require('../lib/note/metadata')

describe('note metadata', function () {
  it('extracts YAML metadata and preserves Markdown', function () {
    assert.deepEqual(extractMeta('---\ntitle: 中文\ntags: [one, two]\n---\n# Body'), {
      meta: { title: '中文', tags: ['one', 'two'] }, markdown: '\n# Body'
    })
  })
  it('supports CRLF and the YAML end marker', function () {
    assert.deepEqual(extractMeta('---\r\ntitle: Test\r\n...\r\nBody'), { meta: { title: 'Test' }, markdown: '\nBody' })
  })
  it('preserves content without valid front matter', function () {
    for (const markdown of ['# Title', '---\nunterminated', '---\ntitle: [\n---\nBody', '---not a delimiter\n---\nBody']) {
      assert.deepEqual(extractMeta(markdown), { meta: {}, markdown })
    }
  })
  it('does not treat an indented delimiter as the end of metadata', function () {
    assert.deepEqual(extractMeta('---\ndescription: |\n  ---\n---\nBody'), { meta: { description: '---\n' }, markdown: '\nBody' })
  })
  it('rejects unsafe YAML tags', function () {
    const markdown = '---\ntitle: !!js/function function () {}\n---\nBody'
    assert.deepEqual(extractMeta(markdown), { meta: {}, markdown })
  })
})
