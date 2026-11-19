'use strict'
const config = require('../config')
const logger = require('../logger')

const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

exports.uploadImage = function (imagePath, callback) {
  if (!imagePath || typeof imagePath !== 'string') {
    callback(new Error('Image path is missing or wrong'), null)
    return
  }

  if (!callback || typeof callback !== 'function') {
    logger.error('Callback has to be a function')
    return
  }

  const apiUrl = ((config.lutim && config.lutim.url) || 'https://framapic.org/').replace(/\/?$/, '/')
  const form = new FormData()
  form.append('format', 'json')
  form.append('file', fs.createReadStream(imagePath))

  axios.post(apiUrl, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity
  }).then(function ({ data: json }) {
    if (config.debug) {
      logger.info('SERVER uploadimage success: ' + JSON.stringify(json))
    }
    callback(null, apiUrl + json.msg.short)
  }).catch(function (err) {
    callback(new Error(err), null)
  })
}
