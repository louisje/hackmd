const common = require('./webpack.common.js')
const htmlexport = require('./webpack.htmlexport')
const { merge } = require('webpack-merge')

module.exports = [
  merge(common, {
    mode: 'development',
    devtool: 'source-map',
    optimization: { minimize: false }
  }),
  merge(htmlexport, {
    mode: 'development',
    devtool: 'source-map',
    optimization: { minimize: false }
  })]
