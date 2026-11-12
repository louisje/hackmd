const common = require('./webpack.common.js')
const htmlexport = require('./webpack.htmlexport')
const { merge } = require('webpack-merge')
const path = require('path')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = [
  merge(common, {
    mode: 'production',
    devtool: process.env.CODIMD_DEBUG_BUNDLE === '1' ? 'source-map' : false,
    optimization: process.env.CODIMD_DEBUG_BUNDLE === '1' ? { minimize: false } : {},
    output: {
      path: path.join(__dirname, 'public/build'),
      publicPath: '/build/',
      filename: '[name].[contenthash].js'
    }
  }),
  merge(htmlexport, {
    mode: 'production',
    optimization: {
      minimizer: [
        '...', new CssMinimizerPlugin()
      ]
    }
  })]
