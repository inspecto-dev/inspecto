const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { webpack4Plugin: inspecto } = require('@inspecto-dev/plugin/legacy/webpack4')

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'classic' }], // React 16 usually uses classic runtime
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    inspecto(),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    port: 3004,
    hot: true,
  },
}
