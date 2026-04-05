const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main:   './src/main.ts',
    editor: './src/editor/index.ts',
  },

  output: {
    filename: '[name].js',
  },

  resolve: {
    extensions: ['.js', '.ts'],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },

  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/' },
        { from: 'data/', to: 'data/' },
      ],
    }),
  ],
};
