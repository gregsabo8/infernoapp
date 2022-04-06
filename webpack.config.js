const path = require('path')
const webpack = require('webpack')

module.exports = {
    //were our files live
  entry: './frontend-js/main.js',
  output: {
    filename: 'main-bundled.js',
    //where to export them to
    path: path.resolve(__dirname, 'public')
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
            //babel lets us write modern syntax js, converts to every web browser(more traditional code)
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}