const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: "./src/js/app.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js",
  },
  mode: "development",
  ignoreWarnings: [
    {
      module: /ethers\.min\.js$/,
      message: /require function is used in a way in which dependencies cannot be statically extracted/
    }
  ],
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "./src/index.html", to: "index.html" },
      ]
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  resolve: {
    fallback: {
      // existing assets
      buffer: require.resolve("buffer/"),
      util:   require.resolve("util/"),
      url:    require.resolve("url/"),
      http:   require.resolve("stream-http"),
      https:  require.resolve("https-browserify"),
      os:     require.resolve("os-browserify/browser"),
      stream: require.resolve("stream-browserify"),
  
      // NEW assets
      crypto: require.resolve("crypto-browserify"),
      path:   require.resolve("path-browserify"),
      assert: require.resolve("assert/"),
      process: require.resolve("process/browser"), 
      vm: require.resolve("vm-browserify")
    }
  },
  
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-transform-runtime"],
          },
        },
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "src"),
    },
    port: 8080,
    hot: true,
    open: true,
  
    client: {
      overlay: true,
      webSocketURL: {
        protocol: "wss",
        hostname: "glowing-spork-r49rv6qv76935gwv-8080.app.github.dev",
        port: 443,        // Codespace forwards wss via 443
        pathname: "/ws",
      },
    },
  },
  
  
};
