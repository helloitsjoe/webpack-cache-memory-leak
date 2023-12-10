const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  resolveLoader: {
    alias: {
      "react-loader": path.resolve(__dirname, "src", "react-loader.js"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      template: "react-loader!./src/app.js",
    }),
  ],
};
