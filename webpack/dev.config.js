const baseConfig = require('./base.config');

module.exports = {
  ...baseConfig,
  mode: 'development',

  devtool: 'source-map',

  devServer: {
    static: './dist',
  },
};
