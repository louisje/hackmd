'use strict'
const fs = require('fs')
const path = require('path')

const config = require('../config')
const { getImageMimeType } = require('../utils')
const logger = require('../logger')

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const protocol = config.minio.secure ? 'https' : 'http'
const endpoint = `${protocol}://${config.minio.endPoint}:${config.minio.port}`
const minioClient = new S3Client({
  endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey
  }
})

exports.uploadImage = function (imagePath, callback) {
  if (typeof callback !== 'function') {
    logger.error('Callback has to be a function')
    return
  }

  if (!imagePath || typeof imagePath !== 'string') {
    callback(new Error('Image path is missing or wrong'), null)
    return
  }

  fs.readFile(imagePath, function (err, buffer) {
    if (err) {
      callback(new Error(err), null)
      return
    }

    const key = path.join('uploads', path.basename(imagePath))
    const params = {
      Bucket: config.s3bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length
    }
    const mimeType = getImageMimeType(imagePath)
    if (mimeType) params.ContentType = mimeType

    Promise.resolve().then(() => minioClient.send(new PutObjectCommand(params))).then(() => {
      const hidePort = [80, 443].includes(config.minio.port)
      const urlPort = hidePort ? '' : `:${config.minio.port}`
      callback(null, `${protocol}://${config.minio.endPoint}${urlPort}/${config.s3bucket}/${key}`)
    }, err => callback(err, null))
  })
}
