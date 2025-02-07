import { Component } from '@alexgyver/component';
import DragBlock from '@alexgyver/drag-block';
import './svp.css'

const offsTop = 16;
const offsBottom = 15;
const minStep = 1;
const maxTStep = 150;
const fsize = 12;
const ystep = 16;

export default class SVPlot {
    data = {};
    cfg = { dark: false, type: 'plot', labels: [], period: 200 };

    /**
     * 
     * @param {HTMLElement} parent 
     * @param {*} params dark: false, type: 'running|stack|plot|timeline', labels: [''], period: 200
     */
    constructor(parent, params = {}) {
        Component.make('div', {
            context: this,
            parent: parent,
            class: 'svp',
            var: 'svp',
            children: [
                {
                    tag: 'div',
                    class: 'menu',
                    children: [
                        {
                            tag: 'div',
                            class: 'labels',
                            var: 'labels',
                        },
                        {
                            tag: 'div',
                            class: 'buttons',
                            children: [
                                {
                                    tag: 'div',
                                    class: 'button',
                                    text: 'SVG',
                                    events: {
                                        click: () => downloadSVG(this.$svg),
                                    }
                                },
                                {
                                    tag: 'div',
                                    class: 'button',
                                    text: 'Clear',
                                    events: {
                                        click: () => { this.data = {}, this._render() },
                                    }
                                },
                                {
                                    tag: 'div',
                                    class: 'button',
                                    text: 'Fit',
                                    events: {
                                        click: () => { this._resetZ(), this._fit(), this._render() },
                                    }
                                },
                                {
                                    tag: 'div',
                                    class: 'button',
                                    text: '➔',
                                    events: {
                                        click: () => this._resetZ(),
                                    }
                                },
                            ]
                        },
                    ],
                },
                {
                    tag: 'div',
                    class: 'svcont',
                    var: 'svcont',
                    child: Component.makeSVG('svg', {
                        context: this,
                        var: 'svg',
                        class: 'svg',
                        style: 'font-family: Verdana, sans-serif;pointer-events: none;',
                        attrs: {
                            width: '100%',
                            height: '100%',
                        },
                        children: [
                            {
                                tag: 'g',
                                var: 'grid',
                            },
                            {
                                tag: 'g',
                                var: 'cursor',
                            },
                            {
                                tag: 'g',
                                var: 'lines',
                            },
                            {
                                tag: 'g',
                                var: 'markers',
                            },
                            {
                                tag: 'g',
                                var: 'gtext',
                            },
                            {
                                tag: 'g',
                                var: 'tooltip',
                                style: 'filter: opacity(0.9)'
                            },
                        ]
                    }),
                }
            ],
        });

        //#region DragBlock
        DragBlock(this.$svcont, (e) => {
            let w = this.$svg.clientWidth;
            let h = this.$svg.clientHeight;
            let timeline = this.cfg.type == 'timeline';

            switch (e.type) {
                case 'zoom': {
                    this._clearMarkers();
                    let t = this.maxSecs;
                    if (e.touch) {
                        this.maxSecs -= e.zoom / (w / this.maxSecs / 2);
                        this.tZero += (this.maxSecs - t) / 2;
                    }
                    else {
                        this.maxSecs *= -e.zoom / 5 + 1;
                        this.tZero += (this.maxSecs - t) * (1 - e.pos.x / w);
                    }
                    this._render();
                } break;

                case 'drag':
                    this.tZero -= e.move.x / (w / this.maxSecs);
                    this.auto = false;
                    this._render();
                    break;

                case 'release':
                    if (this.tZero >= this._lastT()) this._resetZ();
                    break;

                case 'press':
                case 'leave':
                    this._clearMarkers();
                    break;

                case 'move':
                case 'click': {
                    //#region cursor
                    let u = (this.tZero - (1 - e.pos.x / w) * this.maxSecs) * 1000;
                    let twidth = 130;
                    let getDate = (u) => (new Date(u)).toISOString().split('T');

                    Component.configSVG(this.$cursor, {
                        children_r: [
                            makeLine(e.pos.x, e.pos.x, timeline ? 0 : offsTop, h - offsBottom, this._getProp('--grid'), 1),
                            makeRect(e.pos.x - twidth / 2, h - offsBottom, twidth, offsBottom, this._getProp('--grid'), { rx: 3 }),
                            makeText(getDate(u).join(' ').slice(0, -5), e.pos.x, h - 3, this._getProp('--font'), 11, { 'text-anchor': 'middle' }),
                        ]
                    });
                    if (!this.points) break;

                    let makeTooltip = (data) => {
                        let pad = 4;
                        let rect = Component.makeSVG('rect');
                        Component.configSVG(this.$tooltip, {
                            children_r: [rect, ...data]
                        });

                        let bb = this.$tooltip.getBBox();
                        Component.configSVG(rect, {
                            attrs: {
                                x: bb.x - pad,
                                width: bb.width + pad * 2,
                                y: bb.y - pad,
                                height: bb.height + pad * 2,
                                rx: 4,
                                fill: this._getProp('--back'),
                                stroke: this._getProp('--font'),
                            }
                        });
                        Component.configSVG(this.$tooltip, {
                            attrs: { transform: `translate(${w - 1 - bb.width - pad} ${18})` }
                        });
                    }

                    let fcol = this._getProp('--font');
                    if (timeline) {
                        //#region timeline
                        if (e.type == 'click') {
                            for (let p of this.points) {
                                if (e.pos.x >= p.x1 && e.pos.x <= p.x2 && e.pos.y >= p.y1 && e.pos.y <= p.y2) {
                                    let y = -ystep;
                                    let txt = (lbl, f, u, y) => makeText(lbl + ': ' + (f ? 'unknown' : getDate(u).join(' ').slice(0, -5)), 0, y, fcol, fsize);
                                    makeTooltip([
                                        makeText(this.cfg.labels[p.axis], 0, y += ystep, this._getCol(p.axis), fsize, {}, true),
                                        txt('Start', p.block.fstart, p.block.start, y += ystep + 3),
                                        txt('Stop', p.block.fstop, p.block.stop, y += ystep),
                                        makeText('Last: ' + (new Date(p.block.stop - p.block.start).toISOString().substring(11, 19)), 0, y += ystep, fcol, fsize),
                                    ]);
                                }
                            }
                        }
                    } else {
                        //#region line
                        let found = 0;
                        let keys = Object.keys(this.points).map(Number);
                        for (let i = 1; i < keys.length; i++) {
                            if (keys[i] >= u) {
                                found = keys[(keys[i] - u < u - keys[i - 1]) ? i : i - 1];
                                break;
                            }
                        }

                        if (found) {
                            let markers = this.points[found].y.map((y, i) => this._disabled(i) ? null : Component.makeSVG('circle', {
                                attrs: {
                                    cx: this.points[found].x,
                                    cy: y,
                                    r: 4,
                                    stroke: this._getCol(i),
                                    fill: this._getProp('--back'),
                                    'stroke-width': 2,
                                },
                            }));

                            Component.configSVG(this.$markers, {
                                children_r: markers,
                            });

                            let y = -ystep;
                            makeTooltip([
                                ...this.points[found].y.map((v, i) => makeText(
                                    this.cfg.labels[i] + ': ' + this.data[found][i].toFixed(2),
                                    0,
                                    y += ystep,
                                    this._getCol(i),
                                    fsize,
                                    {},
                                    true
                                )),
                                makeText(getDate(found)[0], 0, y += ystep + 5, fcol, fsize),
                                makeText(getDate(found)[1].slice(0, -3), 0, y += ystep, fcol, fsize),
                            ]);
                        }
                    } // type line
                } break;
            }
        });

        this.maxSecs = this.$svg.clientWidth / 10;
        this._resizeh = this._render.bind(this);
        this._resizer = new ResizeObserver(this._resizeh).observe(this.$svg);
        this.setConfig(params);
    }

    //#region setConfig
    /**
     * 
     * @param {*} params dark: false, type: 'running|stack|plot|timeline', labels: [''], period: 200
     */
    setConfig(params) {
        this.cfg = { ...this.cfg, ...params };
        this.$svp.className = 'svp ' + (this.cfg.dark ? 'dark' : 'light');
        this.$svg.style.background = this._getProp('--back');
        this.labels = [];

        Component.config(this.$labels, {
            children_r: this.cfg.labels.map((label, i) => Component.make('div', {
                class: 'label',
                push: this.labels,
                children: [
                    {
                        tag: 'div',
                        class: 'marker',
                        style: `background:${this._getCol(i)}`,
                    },
                    {
                        tag: 'span',
                        text: label,
                    },
                ],
                events: {
                    click: () => {
                        if (this.cfg.type != 'timeline') {
                            this.labels[i].classList.toggle('tint');
                            this._render();
                        }
                    }
                }
            })),
        });

        // running
        if (this.tmr) clearInterval(this.tmr);
        if (this.cfg.type == 'running') {
            this.tmr = setInterval(() => {
                let v = Object.values(this.data).slice(-1)[0];
                if (v) this.setData([...v]);
            }, this.cfg.period);
        }
        this._render();
    }

    //#region setData
    /**
     * @param {*} data 
     * running     [y0, y1, ..]
     * stack       [y0, y1, ..]
     * plot        { x0:[y0, ..], .. }
     * timeline    { x0:[y0, ..], .. }
     * @returns 
     */
    setData(data) {
        if (typeof data !== 'object') return;

        if (this.cfg.type == 'running' || this.cfg.type == 'stack') this.data[(new Date).getTime()] = data;
        else {
            for (let [key, val] of Object.entries(data)) {
                key = Number(key);
                let sec = (key < 99999999999) ? key * 1000 : key;
                this.data[sec] = val;
            }
        }

        if (!this.cfg.labels.length) {
            let vals = Object.values(this.data)[0];
            this.setConfig({ labels: vals.map((x, i) => 'Line ' + i) });
        }

        if (!this.tZero) {
            this.auto = true;
            this._fit();
        }
        if (this.auto) {
            this._resetZ();
            this._clearMarkers();
        } else this._render();
    }

    //#region _render
    _render() {
        this.$lines.replaceChildren();
        this.$grid.replaceChildren();
        this.$gtext.replaceChildren();
        this.points = null;

        if (!this.tZero) return;

        let w = this.$svg.clientWidth;
        let h = this.$svg.clientHeight;
        let keys = Object.keys(this.data).map(Number);
        let scale = (x, in_min, in_max) => map(x, in_min, in_max, h - offsBottom, offsTop);
        let add = (i) => this.points[keys[i]] = this.data[keys[i]];
        let calcX = (t) => (w + (t / 1000 - this.tZero) * w / this.maxSecs);

        // collect
        for (let i = 0; i < keys.length; i++) {
            if (this.points) {
                add(i);
                if (keys[i] >= this.tZero * 1000) break;
            } else {
                if (i + 1 < keys.length && keys[i + 1] >= (this.tZero - this.maxSecs) * 1000) {
                    this.points = {};
                    add(i);
                }
            }
        }
        if (this.points) {
            if (this.cfg.type == 'timeline') {
                //#region TIMELINE

                // states
                let vals = Object.values(this.points);
                let keys = Object.keys(this.points).map(Number);
                let temp = [];
                for (let ax in vals[0]) {
                    let active = [];
                    let start = 0;

                    if (vals[0][ax]) {
                        active.push({ fstart: true, start: keys[0] });
                        start = 1;
                    }

                    for (let t in this.points) {
                        t = Number(t);
                        let state = this.points[t][ax];

                        if (start && !state) {
                            active[active.length - 1].stop = t;
                            start = 0;
                        }
                        if (!start && state) {
                            active.push({ start: t });
                            start = 1;
                        }
                    }
                    if (start) {
                        let a = active[active.length - 1];
                        a.stop = keys[keys.length - 1];
                        a.fstop = true;
                    }
                    temp.push(active);
                }

                // draw
                let am = vals[0].length;
                let csize = (h - offsBottom - 5) / am;
                let bsize = csize * 0.8;
                this.points = [];

                for (let ax in temp) {
                    ax = Number(ax);
                    for (let b of temp[ax]) {
                        let x1 = calcX(b.start);
                        let x2 = calcX(b.stop);
                        let y = csize * ax;
                        this.$lines.appendChild(makeRect(x1, y, x2 - x1, bsize, this._getCol(ax), { rx: 3 }));
                        this.points.push({ x1: x1, x2: x2, y1: y, y2: y + bsize, axis: ax, block: b });
                    }
                }
            } else {
                //#region LINES

                // reduce
                let curlen = Object.keys(this.points).length;
                let maxlen = w / minStep;
                if (curlen > maxlen) {
                    let temp = this.points;
                    this.points = {};
                    let keys = Object.keys(temp);
                    for (let i = 0; i < maxlen; i++) {
                        let n = Math.floor(i / maxlen * curlen);
                        this.points[keys[n]] = temp[keys[n]];
                    }
                }

                // scale
                let max = -999999999, min = 999999999;
                for (let vals of Object.values(this.points)) {
                    for (let i in vals) {
                        if (this._disabled(i)) continue;
                        if (vals[i] > max) max = vals[i];
                        else if (vals[i] < min) min = vals[i];
                    }
                }

                if (min != 999999999) {
                    // lines
                    for (let t in this.points) {
                        let x = calcX(t);
                        let y = this.points[t].map(v => scale(v, min, max));
                        this.points[t] = { x: x, y: y };
                    }

                    let vals = Object.values(this.points);
                    for (let ax in vals[0].y) {
                        if (this._disabled(ax)) continue;
                        let xy = '';
                        vals.forEach(v => xy += `${v.x},${v.y[ax]} `);

                        Component.configSVG(this.$lines, {
                            child: Component.makeSVG('polyline', {
                                attrs: {
                                    points: xy,
                                    fill: 'none',
                                    stroke: this._getCol(ax),
                                    'stroke-width': 2,
                                },
                            }),
                        });
                    }

                    // grid
                    {
                        let am = Math.round(h / 80);
                        let dif = max - min;
                        let step = dif / am;

                        for (let i = 0; i < am + 1; i++) {
                            let y = scale(max - step * i, min, max);
                            if (i != am) this.$grid.appendChild(makeLine(0, w, y, y, this._getProp('--grid'), 1, { 'stroke-dasharray': '7 8' }));
                            this.$gtext.appendChild(makeText((max - step * i).toFixed(1), 0, y - 5, this._getProp('--font'), 12));
                        }
                    }
                } // min != 999999999
            } // LINES
        } // points

        //#region time
        {
            let am = Math.round(w / maxTStep);
            let stepsec = this.maxSecs / am;
            let n = 0;

            for (let t of [86400, 3600, 1800, 60, 30, 10, 5, 1]) {
                if (stepsec >= t) {
                    n = t;
                    break;
                }
            }
            if (!n) n = 0.1;

            stepsec = Math.floor(stepsec / n) * n;
            let start = Math.ceil(this.tZero / stepsec) * stepsec;
            if (!stepsec) return;

            let i = 0;
            while (1) {
                let t = start - stepsec * i;
                let x = w - w * (this.tZero - t) / this.maxSecs;
                if (x < -maxTStep / 2) break;
                i++;

                let ts = (this.maxSecs < 86400) ?
                    new Date(t * 1000).toTimeString().split(' ')[0] :
                    new Date(t * 1000).toISOString().split('T')[0];

                Component.configSVG(this.$grid, {
                    children: [
                        makeLine(0, w, h - offsBottom, h - offsBottom, this._getProp('--grid'), 1.5),
                        makeLine(x, x, h - offsBottom - 6, h - offsBottom - 1, this._getProp('--grid'), 2),
                        makeText(ts, x, h - offsBottom + 14, this._getProp('--font'), 12, { 'text-anchor': 'middle' }),
                    ],
                });
            }
        }
    }
    //#endregion _render

    //#region misc
    _getProp(name) {
        return window.getComputedStyle(this.$svp).getPropertyValue(name);
    }

    _resetZ() {
        this.tZero = this._lastT();
        this.auto = true;
        this._render();
    }
    _lastT() {
        return Number(Object.keys(this.data).slice(-1)[0] / 1000);
    }
    _clearMarkers() {
        this.$cursor.replaceChildren();
        this.$markers.replaceChildren();
        this.$tooltip.replaceChildren();
    }
    _disabled(i) {
        return this.labels[i] && this.labels[i].classList.contains('tint');
    }
    _getCol(i) {
        return getColorIdx(i, this.cfg.dark ? 0.55 : 0.47);
    }
    _fit() {
        let keys = Object.keys(this.data).map(Number);
        if (keys.length > 2) this.maxSecs = (keys[keys.length - 1] - keys[0]) / 1000;
    }

    labels = [];
    points = null;
    tZero = 0;
    maxSecs = 10;
    auto = false;
}

//#region function
function hsl2rgb(h, s, l) {
    h %= 360;
    let a = s * Math.min(l, 1 - l);
    let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return 'rgb(' + Math.round(f(0) * 255) + ',' + Math.round(f(8) * 255) + ',' + Math.round(f(4) * 255) + ')';
}
function getColorIdx(idx, v) {
    return hsl2rgb(idx * 260 + 0, 0.6, v);
}
function downloadSVG(svg) {
    let ser = new XMLSerializer();
    let link = document.createElement('a');
    link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(ser.serializeToString(svg));
    link.download = 'plot.svg';
    link.click();
}
function map(x, in_min, in_max, out_min, out_max) {
    if (in_max == in_min) return 0;
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
function makeRect(x, y, w, h, fill, attrs = {}) {
    return Component.makeSVG('rect', {
        attrs: {
            x: x,
            width: w,
            y: y,
            height: h,
            fill: fill,
            ...attrs,
        },
    })
}
function makeText(text, x, y, fill, size, attrs = {}, bold = false) {
    return Component.makeSVG('text', {
        text: text,
        style: `font-size: ${size}px;font-weight:${bold ? 'bold' : 'unset'}`,
        attrs: {
            x: x,
            y: y,
            fill: fill,
            ...attrs,
        },
    })
}
function makeLine(x1, x2, y1, y2, stroke, strokew, attrs = {}) {
    return Component.makeSVG('line', {
        attrs: {
            x1: x1,
            x2: x2,
            y1: y1,
            y2: y2,
            stroke: stroke,
            fill: 'none',
            'stroke-width': strokew,
            ...attrs,
        },
    })
}