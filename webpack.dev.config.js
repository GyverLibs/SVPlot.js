const path = require('path');
const PACKAGE = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: {
        index: './test_dev/script.js',
    },

    output: {
        filename: 'script.js',
        path: path.resolve(__dirname, 'dev'),
        clean: true,
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader"
                ]
            }
        ]
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: `./test_dev/index.html`,
            filename: `index.html`,
            inject: true,
            minify: false,
            version: PACKAGE.version,
            title: PACKAGE.title,
        }),
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
    ],

    devServer: {
        watchFiles: ['test_dev/*.html'],
        static: path.resolve(__dirname, './dev'),
        hot: true,
        open: true,
    },

    watchOptions: {
        poll: 1000,
    },

    mode: 'development',
};