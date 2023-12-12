const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      template: "./src/index.html",
    }),
  ],
};
