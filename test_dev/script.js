import SVPlot from "../SVPlot.js";

document.addEventListener("DOMContentLoaded", () => {
    let rnd = () => Math.random() * 100 - 50;
    let dark = true;
    let i = 0;
    // dark = false;

    let unix = () => (new Date()).getTime() / 1000;

    let plot1 = new SVPlot(document.getElementById('plot1'), { type: 'running', dark: dark, period: 200 });
    plot1.setConfig({ labels: ['--abc[%]', '-def', 'kek'] });
    setInterval(() => {
        plot1.setData([Math.sin(i) * 2, Math.sin(i + 0.8), Math.sin(i * 2) * 1.5]);
        i += 0.1;
    }, 1000);


    let plot2 = new SVPlot(document.getElementById('plot2'), { type: 'stack', dark: dark });
    setInterval(() => plot2.setData([rnd() * 10]), 500);

    let plot3 = new SVPlot(document.getElementById('plot3'), { type: 'plot', dark: dark });
    let o = {};
    (new Array(2000)).fill(0).map((x, i) => {
        o[i] = [Math.sin(i / 10) * 2, Math.sin(i / 10 + 0.8)];
    });
    plot3.setData(o);
    // plot3.setRange(3);

    let plot4 = new SVPlot(document.getElementById('plot4'), { type: 'timeline', dark: dark });
    o = {};
    let v = [false, false, true, false, true];
    let ch = 0;
    (new Array(20)).fill(0).map((x, i) => { o[unix() - 30 + i] = { [ch]: rnd() > 0 }; if (++ch >= v.length) ch = 0; });
    plot4.setData(o);
});