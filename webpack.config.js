module.exports = {
    entry: './SVPlot.js',
    output: {
        path: __dirname,
        filename: 'SVPlot.min.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
};