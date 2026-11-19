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

  const form = new FormData()
  form.append('image', fs.createReadStream(imagePath))

  axios.post('https://api.imgur.com/3/image', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Client-ID ${config.imgur.clientID}`
    },
    maxBodyLength: Infinity
  }).then(function ({ data: json }) {
    if (config.debug) {
      logger.info('SERVER uploadimage success: ' + JSON.stringify(json))
    }
    callback(null, json.data.link.replace(/^http:\/\//i, 'https://'))
  }).catch(function (err) {
    callback(new Error(err), null)
  })
}
