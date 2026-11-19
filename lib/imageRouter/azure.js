'use strict'
const path = require('path')

const config = require('../config')
const logger = require('../logger')

const { BlobServiceClient } = require('@azure/storage-blob')

exports.uploadImage = function (imagePath, callback) {
  if (!imagePath || typeof imagePath !== 'string') {
    callback(new Error('Image path is missing or wrong'), null)
    return
  }

  if (!callback || typeof callback !== 'function') {
    logger.error('Callback has to be a function')
    return
  }

  let containerClient
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.azure.connectionString)
    containerClient = blobServiceClient.getContainerClient(config.azure.container)
  } catch (err) {
    return callback(new Error(err.message), null)
  }

  containerClient.createIfNotExists({ access: 'blob' })
    .then(function () {
      const blockBlobClient = containerClient.getBlockBlobClient(path.basename(imagePath))
      return blockBlobClient.uploadFile(imagePath).then(function () {
        callback(null, blockBlobClient.url)
      })
    }).catch(function (err) {
      callback(new Error(err.message), null)
    })
}
