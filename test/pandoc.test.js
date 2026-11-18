/* eslint-env mocha */
'use strict'

const assert = require('assert').strict
const { spawnSync } = require('child_process')
const { convert } = require('../lib/note/pandoc')

describe('Pandoc export', function () {
  it('rejects unsupported and inherited output formats', async function () {
    for (const format of ['html', 'constructor', '__proto__']) {
      await assert.rejects(convert('# Test', format, 'Test'), /Unsupported export format/)
    }
  })
  it('converts Markdown to text and binary formats', async function () {
    if (spawnSync(process.env.CMD_PANDOC_EXECUTABLE_PATH || 'pandoc', ['--version']).status !== 0) this.skip()
    this.timeout(30000)
    const text = await convert('# 中文', 'latex', 'Test')
    assert.match(text.toString(), /中文/)
    for (const format of ['docx', 'epub', 'odt']) {
      const binary = await convert('# 中文', format, 'Test')
      assert.equal(binary.subarray(0, 4).toString('hex'), '504b0304')
    }
  })
})
