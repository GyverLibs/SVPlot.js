var path = require('path');

module.exports = {
    entry: './SVPlot.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'SVPlot.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
};