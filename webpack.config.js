const path = require("path");
const BannerPlugin = require("webpack").BannerPlugin;
const TerserPlugin = require("terser-webpack-plugin");
module.exports = {
  // entry: {
  //   main: "./index.js",
  //   dep: "./src/lib/listener/observer.js",
  // },

  entry: "./index.js",
  output: {
    filename: "[name].bundle.user.js",
    path: path.resolve(__dirname, "dist"),
  },

  // plugins: [
  //     new BannerPlugin({
  //         banner: "Copyright (c) 2021-2022 <NAME>",
  //         raw: true,
  //     }),
  // ],

  // optimize: {
  //   minimizer: [
  //     For the compression configuration of the main entrance, remove the comment
  //     new TerserPlugin({
  //       test: /\.js(\?. *)?$/i,
  //       include: /main\.bundle\.js/, // or by the name of the chunk
  //       terserOptions: {
  //         output: {
  //           comments: true,
  //         },
  //       },
  //       extractComments: false,
  //     }),
  //     For the compression configuration of the special entry, leave comments
  //     new TerserPlugin({
  //       test: /\.js(\?. *)?$/i,
  //       include: /special\.bundle\.js/,
  //       terserOptions: {
  //         output: {
  //           comments: false, // Keep all comments, or use regular matching to keep specific comments
  //         },
  //       },
  //       extractComments: false,
  //     }),
  //   ],
  // },

  externals: { "utf-8-validate": "utf-8-validate", bufferutil: "bufferutil", vscode: "vscode" },

  devtool: "source-map",
  // devtool: "nosources-source-map"
};
