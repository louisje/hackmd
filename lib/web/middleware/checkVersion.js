'use strict'

const axios = require('axios')

const logger = require('../../logger')
const config = require('../../config')

let lastCheckAt

const VERSION_CHECK_ENDPOINT = 'https://evangelion.codimd.dev/'
const CHECK_TIMEOUT = 1000 * 60 * 60 * 24 // 1 day

exports.checkVersion = checkVersion
/**
 * @param {Express.Application|Express.Request} ctx
 */
async function checkVersion (ctx) {
  if (lastCheckAt && (lastCheckAt + CHECK_TIMEOUT > Date.now())) {
    return
  }

  // update lastCheckAt whether the check would fail or not
  lastCheckAt = Date.now()

  try {
    const { status, data } = await axios.get(VERSION_CHECK_ENDPOINT, {
      params: { v: config.version },
      timeout: 3000,
      validateStatus: () => true
    })

    if (status !== 200 || data.status === 'error') {
      logger.warn('Version check failed.')
      return
    }

    const locals = ctx.locals ? ctx.locals : ctx.app.locals

    locals.versionInfo.latest = data.latest
    locals.versionInfo.versionItem = data.latest ? null : data.versionItem

    if (!data.latest) {
      const { version, link } = data.versionItem

      logger.info(`Your CodiMD version is out of date! The latest version is ${version}. Please see what's new on ${link}.`)
    }
  } catch (err) {
    // ignore and skip version check
    logger.warn('Version check failed.')
    logger.warn(err)
  }
}

exports.versionCheckMiddleware = function (req, res, next) {
  checkVersion(req)
    .then(() => {
      next()
    })
    .catch((err) => {
      logger.error(err)
      next()
    })
}
