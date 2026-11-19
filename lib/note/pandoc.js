'use strict'

const { execFile } = require('child_process')

const outputFormats = Object.freeze({
  asciidoc: 'text/plain',
  context: 'application/x-latex',
  epub: 'application/epub+zip',
  epub3: 'application/epub+zip',
  latex: 'application/x-latex',
  odt: 'application/vnd.oasis.opendocument.text',
  pdf: 'application/pdf',
  rst: 'text/plain',
  rtf: 'application/rtf',
  textile: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
})

function convert (content, format, title) {
  if (!Object.hasOwn(outputFormats, format)) return Promise.reject(new Error('Unsupported export format'))
  return new Promise((resolve, reject) => {
    const child = execFile(process.env.CMD_PANDOC_EXECUTABLE_PATH || 'pandoc', [
      '--from=markdown', `--to=${format}`, '--metadata', `title=${title}`, '--sandbox', '--output=-'
    ], {
      encoding: 'buffer', timeout: 30000, maxBuffer: 32 * 1024 * 1024, killSignal: 'SIGKILL'
    }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
    child.stdin.on('error', reject)
    child.stdin.end(content)
  })
}

module.exports = { convert, outputFormats }
