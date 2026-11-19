'use strict'

const { renderPDF, PDFBusyError } = require('./pdf')
const shortId = require('shortid')
const querystring = require('querystring')
const moment = require('moment')
const { convert, outputFormats } = require('./pandoc')

const config = require('../config')
const logger = require('../logger')
const { Note, Revision } = require('../models')
const { errorInternalError, errorNotFound } = require('../response')

function actionPublish (req, res, note) {
  res.redirect(config.serverURL + '/s/' + (note.alias || note.shortid))
}

function actionSlide (req, res, note) {
  res.redirect(config.serverURL + '/p/' + (note.alias || note.shortid))
}

function actionDownload (req, res, note) {
  const body = note.content
  const title = Note.decodeTitle(note.title)
  const filename = encodeURIComponent(title)
  res.set({
    'Access-Control-Allow-Origin': '*', // allow CORS as API
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Cache-Control, Content-Encoding, Content-Range',
    'Content-Type': 'text/markdown; charset=UTF-8',
    'Cache-Control': 'private',
    'Content-disposition': 'attachment; filename=' + filename + '.md',
    'X-Robots-Tag': 'noindex, nofollow' // prevent crawling
  })
  res.send(body)
}

function actionInfo (req, res, note) {
  const body = note.content
  const extracted = Note.extractMeta(body)
  const markdown = extracted.markdown
  const meta = Note.parseMeta(extracted.meta)
  const createtime = note.createdAt
  const updatetime = note.lastchangeAt
  const title = Note.decodeTitle(note.title)

  const data = {
    title: meta.title || title,
    description: meta.description || (markdown ? Note.generateDescription(markdown) : null),
    viewcount: note.viewcount,
    createtime: createtime,
    updatetime: updatetime
  }

  res.set({
    'Access-Control-Allow-Origin': '*', // allow CORS as API
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Cache-Control, Content-Encoding, Content-Range',
    'Cache-Control': 'private', // only cache by client
    'X-Robots-Tag': 'noindex, nofollow' // prevent crawling
  })
  res.send(data)
}

async function actionPDF (req, res, note) {
  try {
    const url = config.serverURL || 'http://' + req.get('host')
    const extracted = Note.extractMeta(note.content)
    const content = extracted.markdown.replace(/\]\(\//g, '](' + url + '/')
    const filename = encodeURIComponent(Note.decodeTitle(note.title))
    const pdf = await renderPDF(content, url)
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '.pdf"')
    res.setHeader('Cache-Control', 'private')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.send(pdf)
  } catch (error) {
    if (error instanceof PDFBusyError) {
      res.setHeader('Retry-After', '5')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(503).send('PDF renderer is busy. Try again later.')
    }
    logger.error('PDF generation failed: ' + error.message)
    return errorInternalError(req, res)
  }
}

async function actionPandoc (req, res, note) {
  var url = config.serverURL || 'http://' + req.get('host')
  var body = note.content
  var extracted = Note.extractMeta(body)
  var content = extracted.markdown
  var title = Note.decodeTitle(note.title)

  content = content.replace(/\]\(\//g, '](' + url + '/')

  const { exportType } = req.query
  if (typeof exportType !== 'string' || !Object.hasOwn(outputFormats, exportType)) {
    return res.sendStatus(400)
  }

  const contentType = outputFormats[exportType]
  if (!contentType) {
    return res.sendStatus(400)
  }

  try {
    const data = await convert(content, exportType, title)
    var filename = title
    // Be careful of special characters
    filename = encodeURIComponent(filename)
    // Ideally this should strip them
    res.setHeader('Content-disposition', `attachment; filename="${filename}.${exportType}"`)
    res.setHeader('Cache-Control', 'private')
    res.setHeader('Content-Type', `${contentType}; charset=UTF-8`)
    res.setHeader('X-Robots-Tag', 'noindex, nofollow') // prevent crawling
    res.send(data)
  } catch (err) {
    // TODO: handle error
    res.json({
      message: err.message
    })
  }
}

function actionGist (req, res, note) {
  const data = {
    client_id: config.github.clientID,
    redirect_uri: config.serverURL + '/auth/github/callback/' + Note.encodeNoteId(note.id) + '/gist',
    scope: 'gist',
    state: shortId.generate()
  }
  const query = querystring.stringify(data)
  res.redirect('https://github.com/login/oauth/authorize?' + query)
}

function actionRevision (req, res, note) {
  const actionId = req.params.actionId
  if (actionId) {
    const time = moment(parseInt(actionId))
    if (!time.isValid()) {
      return errorNotFound(req, res)
    }
    Revision.getPatchedNoteRevisionByTime(note, time, function (err, content) {
      if (err) {
        logger.error(err)
        return errorInternalError(req, res)
      }
      if (!content) {
        return errorNotFound(req, res)
      }
      res.set({
        'Access-Control-Allow-Origin': '*', // allow CORS as API
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Cache-Control, Content-Encoding, Content-Range',
        'Cache-Control': 'private', // only cache by client
        'X-Robots-Tag': 'noindex, nofollow' // prevent crawling
      })
      res.send(content)
    })
  } else {
    Revision.getNoteRevisions(note, function (err, data) {
      if (err) {
        logger.error(err)
        return errorInternalError(req, res)
      }
      const result = {
        revision: data
      }
      res.set({
        'Access-Control-Allow-Origin': '*', // allow CORS as API
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Cache-Control, Content-Encoding, Content-Range',
        'Cache-Control': 'private', // only cache by client
        'X-Robots-Tag': 'noindex, nofollow' // prevent crawling
      })
      res.send(result)
    })
  }
}

exports.actionPublish = actionPublish
exports.actionSlide = actionSlide
exports.actionDownload = actionDownload
exports.actionInfo = actionInfo
exports.actionPDF = actionPDF
exports.actionGist = actionGist
exports.actionPandoc = actionPandoc
exports.actionRevision = actionRevision
