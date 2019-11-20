const merge = require("webpack-merge");
const webpack = require("webpack");
const path = require("path");

const args = process.argv.slice(2);

const baseConfig = require("./node_modules/@mendix/pluggable-widgets-tools/configs/webpack.config.dev.js");

const customConfig = {
    // Custom configuration goes here
    devtool: false,
};

const previewConfig = {

};

module.exports = [merge(baseConfig[0], customConfig), merge(baseConfig[1], previewConfig)];
