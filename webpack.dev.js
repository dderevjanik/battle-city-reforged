const baseConfig = require('./webpack.common');

module.exports = {
  ...baseConfig,
  mode: 'development',

  devtool: 'source-map',

  devServer: {
    static: './dist',
  },
};
