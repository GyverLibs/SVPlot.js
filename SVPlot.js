import { EL, SVG } from '@alexgyver/component';
import DragBlock from '@alexgyver/drag-block';
import { addStyle, constrain, hsl2rgb, last, localTime, map, now, waitFrame, waitRender } from '@alexgyver/utils';
// import './svp.css'

const offsTop = 16;
const offsBottom = 15;
const minStep = 1;
const maxTStep = 150;
const fsize = 12;
const ystep = 16;
const minRange = 1;
const maxRange = 10 * 365 * 24 * 60 * 60;

export default class SVPlot {
    data = {};
    cfg = { dark: false, type: 'plot', labels: [], period: 200 };
    sel_mode = false;
    pressX = 0;

    /**
     * 
     * @param {HTMLElement} parent 
     * @param {*} params dark: false, type: 'running|stack|plot|timeline', labels: [''], period: 200
     */
    constructor(parent, params = {}, context = window) {
        SVPlot.css = addStyle(SVPlot.css);
        parent.style.overflow = 'hidden';

        EL.make('div', {
            context: this,
            parent: parent,
            class: 'svp',
            $: 'svp',
            children: [
                {
                    class: 'menu',
                    children: [
                        {
                            class: 'labels',
                            $: 'labels',
                        },
                        {
                            style: 'display:flex',
                            children: [
                                {
                                    class: 'buttons none',
                                    $: 'buttons',
                                    children: [
                                        {
                                            class: 'button',
                                            child: makeIcon('M 2,12 H 22 M 2,12 6.2,16.2 M 2,12 6.2,7.7 M 22,12 17.7,7.7 M 22,12 17.7,16.2'),
                                            events: {
                                                click: () => this.fitData(),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            $: 'single',
                                            child: makeIcon('M17 4V20M17 20L13 16M17 20L21 16M7 20V4M7 4L3 8M7 4L11 8'),
                                            events: {
                                                click: () => {
                                                    this.$single.classList.toggle('active');
                                                    this._render();
                                                }
                                            }
                                        },
                                        {
                                            class: 'button',
                                            text: '1s',
                                            events: {
                                                click: () => this._setMax(1),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            text: '1m',
                                            events: {
                                                click: () => this._setMax(60),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            text: '1h',
                                            events: {
                                                click: () => this._setMax(3600),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            text: '1d',
                                            events: {
                                                click: () => this._setMax(86400),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            text: '1w',
                                            events: {
                                                click: () => this._setMax(86400 * 7),
                                            }
                                        }, {
                                            class: ['sel_mode', 'button'],
                                            $: 'sel_mode',
                                            child: makeIcon('M4.4 3.4c-.5-.1-.7-.2-.84-.14a.5.5 0 0 0-.3.3c-.1.16.0.4.14.84l4.21 14.3c.13.4.2.64.3.7a.5.5 0 0 0 .4.1c.16-.03.3-.2.6-.5L12 16l4.4 4.4.2.2.3.3.4.3a.5.5 0 0 0 .31 0c.1-.0.2-.14.41-.3l2.9-2.9c.2-.2.3-.3.3-.41a.5.5 0 0 0 0-.31c-.1-.1-.1-.2-.3-.41L16 12l3.1-3.1c.3-.3.47-.47.5-.63a.5.5 0 0 0-.1-.4c-.1-.13-.3-.2-.74-.31l-14.3-4.2Z'),
                                            events: {
                                                click: () => {
                                                    this.sel_mode = !this.sel_mode;
                                                    this.$sel_mode.classList.toggle('active');
                                                }
                                            },
                                        },
                                        {
                                            class: 'button',
                                            child: makeIcon('M3 21L21 3M3 21H9M3 21L3 15M21 3H15M21 3V9'),
                                            $: 'fullscr',
                                            events: {
                                                click: () => {
                                                    this.$svp.classList.toggle('fullscreen');
                                                    this.$fullscr.classList.toggle('active');
                                                }
                                            }
                                        },
                                        {
                                            class: 'button',
                                            child: makeIcon('M21 21H3M18 11L12 17M12 17L6 11M12 17V3'),
                                            events: {
                                                click: () => downloadSVG(this.$plot),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            child: makeIcon('M18 6L6 18M6 6L18 18'),
                                            events: {
                                                click: () => this.clearData(),
                                            }
                                        },
                                        {
                                            class: 'button',
                                            child: makeIcon('M4 12H20M20 12L14 6M20 12L14 18'),
                                            $: 'auto',
                                            events: {
                                                click: () => this.autoData(),
                                            },
                                        },
                                    ]
                                },
                            ],
                        },
                        {
                            class: 'dots',
                            child: {
                                tag: 'svg',
                                $: 'dots',
                                style: 'width: 4px;height: 18px',
                                children: [...Array(3).keys()].map(i => {
                                    return {
                                        tag: 'circle',
                                        attrs: {
                                            cx: 2,
                                            cy: 2 + 7 * i,
                                            r: 2,
                                            fill: 'var(--font)',
                                        }
                                    }
                                }),
                            },
                            events: {
                                click: () => {
                                    this.$buttons.classList.toggle('none');
                                    this.$labels.classList.toggle('none');
                                },
                            },
                        },
                    ],
                },
                {
                    class: 'svcont',
                    $: 'svcont',
                    child: {
                        tag: 'svg',
                        $: 'plot',
                        class: 'svg',
                        style: 'font-family: Verdana, sans-serif;pointer-events: none;',
                        attrs: {
                            width: '100%',
                            height: '100%',
                        },
                        children: [
                            { tag: 'g', $: 'grid' },
                            { tag: 'g', $: 'cursor' },
                            { tag: 'g', $: 'lines' },
                            { tag: 'g', $: 'markers' },
                            { tag: 'g', $: 'gtext' },
                            {
                                tag: 'g', $: 'dur', children: [
                                    { tag: 'rect', $: 'dur_rect', attrs: { y: offsTop - 1, width: 0, stroke: 'none', fill: 'black' }, style: 'filter: opacity(0.3)' },
                                    { tag: 'text', $: 'dur_text', attrs: { y: offsTop - 5, fill: '--font', 'text-anchor': 'middle' }, style: 'font-size: 13px' },
                                ]
                            },
                            { tag: 'g', $: 'tooltip', style: 'filter: opacity(0.9)' },
                        ]
                    },
                }
            ],
        });

        //#region DragBlock
        DragBlock(this.$svcont, (e) => {
            let w = this.$plot.clientWidth;
            let h = this.$plot.clientHeight;
            if (!w || !h) return;

            let timeline = this.cfg.type == 'timeline';
            if (e.touch && e.type === 'move') e.type = 'drag';
            let isUnix = this._isUnix();
            let toSec = unix => (unix / 1000000).toFixed(3);

            switch (e.type) {
                case 'zoom': {
                    let limit = () => this.maxSecs = constrain(this.maxSecs, minRange, maxRange);
                    let tmp = this.maxSecs;
                    if (e.touch) {
                        this.maxSecs -= e.zoom / (w / this.maxSecs / 2);
                        limit();
                        this.tZero += (this.maxSecs - tmp) / 2;
                    } else {
                        this.maxSecs *= -e.zoom / 5 + 1;
                        limit();
                        this.tZero += (this.maxSecs - tmp) * (1 - e.pos.x / w);
                    }
                    if (this.auto) this._resetZ();
                    this._clearMarkers();
                    this._render();
                } break;

                case 'drag':
                    if (this.sel_mode) {
                        let durw = Math.abs(e.pos.x - this.pressX);
                        let durx = Math.min(this.pressX, e.pos.x);
                        let durs = durw / w * this.maxSecs;
                        let tshow = isUnix ? (Math.floor(durs / 86400) + ':' + new Date(durs * 1000).toISOString().slice(11, 22)) : toSec(durs * 1000);
                        SVG.config(this.$dur_rect, {
                            attrs: { x: Math.min(this.pressX, e.pos.x), width: durw }
                        });
                        SVG.config(this.$dur_text, {
                            attrs: { x: durx + durw / 2, fill: this._getProp('--font') },
                            text: tshow,
                        });
                    } else {
                        this.tZero -= e.move.x / (w / this.maxSecs);
                        this._auto(false);
                        this._render();
                    }
                    break;

                case 'press':
                case 'tpress':
                    this._clearMarkers();
                    this.pressX = e.pos.x;
                    if (this.sel_mode) {
                        SVG.config(this.$dur_rect, {
                            attrs: { x: e.pos.x, width: 0, height: h - offsBottom - offsTop },
                        });
                        this.$dur.style.display = 'unset';
                    }
                    break;

                case 'release':
                case 'trelease':
                    this.$dur.style.display = 'none';
                    break;

                case 'leave':
                    this._clearMarkers();
                    break;

                case 'move':
                case 'click': {
                    //#region cursor
                    let unix = (this.tZero - (1 - e.pos.x / w) * this.maxSecs) * 1000;
                    let getDate = (u) => localTime(u).toISOString().split('T');
                    let tshow = isUnix ? getDate(unix).join(' ').slice(0, -3) : toSec(unix);

                    let tab, txt;
                    SVG.config(this.$cursor, {
                        children_r: [
                            makeLine(e.pos.x, timeline ? 0 : offsTop, e.pos.x, h - offsBottom, this._getProp('--grid'), 1),
                            tab = SVG.rect(0, h - offsBottom, 0, offsBottom, 3, 0, { fill: this._getProp('--grid') }),
                            txt = makeText(tshow, e.pos.x, h - 3, this._getProp('--font'), 12, { 'text-anchor': 'middle' }),
                        ]
                    });

                    let bb = txt.getBBox();
                    SVG.config(txt, { attrs: { x: constrain(bb.x + bb.width / 2, bb.width / 2, w - bb.width / 2) } });

                    const pad = 4;
                    bb = txt.getBBox();
                    SVG.config(tab, { attrs: { width: bb.width + pad * 2, x: bb.x - pad } });
                    if (!this.points) break;

                    let makeTooltip = (data) => {
                        const pad = 4;
                        let rect = SVG.make('rect');
                        SVG.config(this.$tooltip, { children_r: [rect, ...data] });

                        let bb = this.$tooltip.getBBox();
                        SVG.config(rect, {
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
                        SVG.config(this.$tooltip, {
                            attrs: { transform: `translate(${w - 1 - bb.width - pad} ${18})` }
                        });
                    }

                    let fcol = this._getProp('--font');
                    if (timeline) {
                        //#region timeline
                        if (e.type == 'click') {
                            for (let p of this.points) p.rect.classList.remove('active');
                            for (let p of this.points) {
                                if (e.pos.x >= p.x1 && e.pos.x <= p.x2 && e.pos.y >= p.y1 && e.pos.y <= p.y2) {
                                    let y = -ystep;
                                    let makeT = (unix) => { return isUnix ? getDate(unix).join(' ').slice(0, -5) : toSec(unix) };
                                    let dur = isUnix ? (new Date(p.block.stop - p.block.start).toISOString().substring(11, 19)) : toSec(p.block.stop - p.block.start);
                                    makeTooltip([
                                        makeText(this.cfg.labels[p.axis], 0, y += ystep, this._getCol(p.axis), fsize, {}, true),
                                        makeText('Start: ' + (p.block.fstart ? '-' : makeT(p.block.start)), 0, y += ystep + 3, fcol, fsize),
                                        makeText('Stop: ' + (p.block.fstop ? '-' : makeT(p.block.stop)), 0, y += ystep, fcol, fsize),
                                        makeText('Duration: ' + dur, 0, y += ystep, fcol, fsize),
                                    ]);
                                    p.rect.classList.add('active');
                                    break;
                                }
                            }
                        }
                    } else {
                        //#region line
                        let found = 0;
                        let keys = Object.keys(this.points).map(Number);
                        for (let i = 1; i < keys.length; i++) {
                            if (keys[i] >= unix) {
                                found = keys[(keys[i] - unix < unix - keys[i - 1]) ? i : i - 1];
                                break;
                            }
                        }

                        if (found && this.points[found].y) {
                            SVG.config(this.$markers, {
                                children_r: this.points[found].y.map((y, i) => {
                                    if (this._disabled(i)) return null;

                                    return SVG.circle(this.points[found].x, y, 4,
                                        {
                                            stroke: this._getCol(i),
                                            fill: this._getProp('--back'),
                                            'stroke-width': 2
                                        });
                                }),
                            });

                            let y = -ystep;
                            makeTooltip([
                                ...this.points[found].y.map((v, i) => makeText(
                                    `${this.cfg.labels[i] ?? i}: ${this.data[found][i].toFixed(2)}${this.units[i] ?? ''}`,
                                    0,
                                    y += ystep,
                                    this._getCol(i),
                                    fsize,
                                    {},
                                    true
                                )),
                                makeText(isUnix ? getDate(found)[0] : (found / 1000000).toFixed(3), 0, y += ystep + 5, fcol, fsize),
                                isUnix ? makeText(getDate(found)[1].slice(0, -2), 0, y += ystep, fcol, fsize) : null,
                            ]);
                        }
                    } // type line
                } break;
            }
        }, context);

        this.setConfig(params);

        this._resizer = new ResizeObserver(() => waitFrame().then(() => this._render()));
        this._resizer.observe(this.$plot);

        waitRender(this.$plot, () => {
            this.maxSecs = this.$plot.clientWidth / 10;
            if (this.maxSecs < 30) this.maxSecs = 30;
        });
    }

    // release resizer
    release() {
        this._resizer.disconnect();
    }

    //#region setConfig
    /**
     * 
     * @param {*} params dark: false, type: 'running|stack|plot|timeline', labels: [''], period: 200
     */
    setConfig(params) {
        this.cfg = { ...this.cfg, ...params };
        this.$svp.className = 'svp ' + (this.cfg.dark ? 'dark' : 'light');
        this.$plot.style.background = this._getProp('--back');

        this.units = [];
        this.dashed = [];
        this.cfg.labels = this.cfg.labels.map(l => {
            let unit = '';
            let res = l.match(/(.*)\[(.*)\]$/);
            if (res) l = res[1], unit = res[2];
            this.units.push(unit);
            let n = 0;
            while (l.startsWith('-')) l = l.slice(1), ++n;
            this.dashed.push(n);
            return l;
        });

        this.labels = [];

        EL.config(this.$labels, {
            children_r: this.cfg.labels.map((label, i) => EL.make('div', {
                class: 'label',
                push: this.labels,
                children: [
                    {
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

        if (this.tmr) clearTimeout(this.tmr);
        this._render();
    }

    /**
     * 
     * @param {Array} labels
     */
    setLabels(labels) {
        this.setConfig({ labels: labels });
    }

    //#region config data
    // clear plot data
    clearData() {
        this.data = {};
        this.tZero = now() / 1000 | 0;
        this._render();
    }

    // stretch plot to fill window
    fitData() {
        this._resetZ();
        this._fit();
        this._render();
    }

    // move right and shift on new data
    autoData() {
        this._resetZ();
        this._auto(true);
        this._render();
    }

    //#region setData
    /**
     * if sequence starts with 0 - will be displayed in seconds (add time in ms). If not 0 - unix date-time mode (add time in sec or ms)
     * @param {*} data 
     * running     [ y0, y1, .. ]
     * stack       [ y0, y1, .. ]
     * plot        { t0: [y0, ..], .. }
     * timeline    { t0: [y0, ..], .. } | { t0: {y0:state, y2:state}, .. }
     */
    setData(data) {
        let arr = Array.isArray(data);
        let cmp = (a1, a2) => a1 && a2 && a1.every((v, i) => v === a2[i]);

        switch (this.cfg.type) {
            case 'running':
                if (this.tmr) clearTimeout(this.tmr);
                this.tmr = setTimeout(() => {
                    let vals = Object.values(this.data);
                    if (vals.length < 2) return;

                    if (cmp(last(vals), last(vals, 2))) {
                        delete this.data[last(Object.keys(this.data))];
                    }
                    this.setData([...last(vals)]);
                }, this.cfg.period);

            // fall
            case 'stack':
                if (!arr) return;
                this.data[now()] = data.map(Number);
                break;

            case 'timeline':
                if (arr) return;

                if (!Array.isArray(Object.values(data)[0])) {
                    let axes = {};
                    for (let t in data) {
                        for (let ax in data[t]) axes[ax] = true;
                    }
                    let states = new Array(Object.keys(axes).length).fill(false);

                    let vals = Object.values(this.data);
                    if (vals.length) states = [...last(vals)];

                    for (let t in data) {
                        for (let ax in data[t]) states[ax] = data[t][ax];
                        data[t] = [...states];
                    }
                }
            // fall
            default:
                if (arr) return;
                let lastv = Number(last(Object.keys(this.data)));

                for (let key in data) {
                    let t = Number(key);
                    t = Math.floor((t < 99999999999) ? t * 1000 : t);
                    if (!lastv || lastv < t) this.data[t] = data[key].map(Number);
                }
                break;
        }

        if (!this.cfg.labels.length) {
            let vals = Object.values(this.data);
            if (vals.length) this.setConfig({ labels: vals[0].map((x, i) => 'Line ' + i) });
        }

        if (!this.tZero) {
            this._auto(true)
            this._fit();
        }

        if (this.auto) {
            this._resetZ();
            this._clearMarkers();
        }
        this._render();
    }

    //#region _render
    _render() {
        EL.clear(this.$lines);
        EL.clear(this.$grid);
        EL.clear(this.$gtext);
        this.points = null;

        if (!this.tZero) return;

        let w = this.$plot.clientWidth;
        let h = this.$plot.clientHeight;
        if (h < 50) return;

        let keys = Object.keys(this.data).map(Number);
        let scale = (x, in_min, in_max) => map(x, in_min, in_max, h - offsBottom, offsTop);
        let calcX = (t) => (w + (t / 1000 - this.tZero) * w / this.maxSecs);

        // collect
        let add = (i) => this.points[keys[i]] = this.data[keys[i]];
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
                            last(active).stop = t;
                            start = 0;
                        }
                        if (!start && state) {
                            active.push({ start: t });
                            start = 1;
                        }
                    }
                    if (start) {
                        let a = last(active);
                        a.stop = last(keys);
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
                        let y = csize * ax + (csize - bsize) / 2;
                        let rect = SVG.rect(x1, y, x2 - x1, bsize, 3, 0, { fill: this._getCol(ax) }, { class: 'tblock' });
                        this.$lines.appendChild(rect);
                        rect.style.setProperty('--active', getColorIdx(ax, 1, this._getColv() + 0.1));
                        this.points.push({ x1: x1, x2: x2, y1: y, y2: y + bsize, axis: ax, block: b, rect: rect });
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
                const maxv = 999999999;
                let max = -maxv, min = maxv;
                let maxs = {}, mins = {};
                for (let t in this.points) {
                    let vals = this.points[t];
                    for (let i in vals) {
                        if (this._disabled(i)) continue;
                        if (vals[i] > max) max = vals[i];
                        if (vals[i] < min) min = vals[i];
                        if (!(i in maxs)) maxs[i] = -maxv;
                        if (!(i in mins)) mins[i] = maxv;
                        if (vals[i] > maxs[i]) maxs[i] = vals[i];
                        if (vals[i] < mins[i]) mins[i] = vals[i];
                    }
                }

                if (min != maxv) {
                    let singleY = this.$single.classList.contains('active');

                    // lines
                    for (let t in this.points) {
                        let x = calcX(t);
                        let y;
                        if (singleY) y = this.points[t].map((v, i) => scale(v, mins[i], maxs[i]));
                        else y = this.points[t].map(v => scale(v, min, max));
                        this.points[t] = { x: x, y: y };
                    }

                    let vals = Object.values(this.points);
                    for (let ax in vals[0].y) {
                        if (this._disabled(ax)) continue;
                        let xy = '';
                        vals.forEach(v => xy += `${v.x},${v.y[ax]} `);
                        let d = this.dashed[ax];

                        SVG.config(this.$lines, {
                            child: SVG.polyline(xy, { fill: 'none', stroke: this._getCol(ax), 'stroke-width': d ? 1.5 : 2, 'stroke-dasharray': `${d * 3} ${d * 2}` })
                        });
                    }

                    // grid
                    {
                        const letsize = 9;
                        let am = Math.round(h / 80);
                        let dif = max - min;
                        let step = dif / am;
                        let shadow = { filter: `drop-shadow(0 0 1px ${this._getProp('--back')})` };

                        for (let i = 0; i < am + 1; i++) {
                            let y = scale(max - step * i, min, max);
                            if (i != am) this.$grid.appendChild(makeLine(0, y, w, y, this._getProp('--grid'), 1, { 'stroke-dasharray': '7 8' }));
                            if (!singleY) this.$gtext.appendChild(makeText((max - step * i).toFixed(1), 0, y - 5, this._getProp('--font'), 12, shadow));
                        }

                        if (singleY) {
                            let x = 0;
                            for (let ax in maxs) {
                                ax = Number(ax);
                                for (let i = 0; i < am + 1; i++) {
                                    let y = scale(max - step * i, min, max);
                                    this.$gtext.appendChild(makeText((maxs[ax] - (maxs[ax] - mins[ax]) / am * i).toFixed(1), x, y - 5, this._getCol(ax), 12, shadow));
                                }
                                x += Math.max((maxs[ax].toFixed(1)).length, (mins[ax].toFixed(1)).length) * letsize;
                            }
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
            let isUnix = this._isUnix();

            let i = 0;
            while (1) {
                let t = start - stepsec * i;
                let x = w - w * (this.tZero - t) / this.maxSecs;
                if (x < -maxTStep / 2) break;
                i++;

                if (isUnix) t = (this.maxSecs < 86400) ? new Date(t * 1000).toTimeString().split(' ')[0] : new Date(t * 1000).toISOString().split('T')[0];
                else t = (t / 1000.0).toFixed(1);

                SVG.config(this.$grid, {
                    children: [
                        makeLine(0, h - offsBottom, w, h - offsBottom, this._getProp('--grid'), 1.5),
                        makeLine(x, h - offsBottom - 6, x, h - offsBottom - 1, this._getProp('--grid'), 2),
                        makeText(t, x, h - offsBottom + 14, this._getProp('--font'), 11, { 'text-anchor': 'middle' }),
                    ],
                });
            }
        }
    }
    //#endregion _render

    //#region misc
    _isUnix() {
        return Number(Object.keys(this.data)[0]);
    }
    _getProp(name) {
        return window.getComputedStyle(this.$svp).getPropertyValue(name);
    }
    _resetZ() {
        let keys = Object.keys(this.data);
        this.tZero = (keys.length ? Number(keys.slice(-1)[0]) : now()) / 1000;
    }
    _clearMarkers() {
        EL.clear(this.$cursor);
        EL.clear(this.$markers);
        EL.clear(this.$tooltip);
    }
    _disabled(i) {
        return this.labels[i] && this.labels[i].classList.contains('tint');
    }
    _getColv() {
        return this.cfg.dark ? 0.55 : 0.47;
    }
    _getCol(i) {
        return getColorIdx(i, 0.6, this._getColv());
    }
    _fit() {
        let keys = Object.keys(this.data).map(Number);
        if (keys.length > 2) this.maxSecs = (last(keys) - keys[0]) / 1000;
    }
    _auto(state) {
        if (this.auto == state) return;
        this.auto = state;
        state ? this.$auto.classList.add('active') : this.$auto.classList.remove('active');
    }
    _setMax(s) {
        this.maxSecs = s;
        this._render();
    }

    labels = [];
    units = [];
    dashed = [];
    points = null;
    tZero = 0;
    maxSecs = 10;
    auto = false;

    // https://www.minifier.org/
    static css = `.svp.light{--back:#fff;--font:#111;--grid:#cacaca}.svp.dark{--back:#1c1d22;--font:#c3c3c3;--grid:#4a4a4a}.svp{all:unset;font-family:Verdana,sans-serif;background:var(--back);height:100%;width:100%;display:flex;flex-direction:column;color:var(--font);user-select:none;padding:4px;box-sizing:border-box;z-index:10}.svp.fullscreen{position:fixed;left:0;top:0}.svp .svcont{width:100%;height:100%;overflow:hidden;touch-action:none}.svp .menu{all:unset;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:5px 3px;min-height:24px}.svp .label{all:unset;display:inline-flex;vertical-align:middle;align-items:center;padding-right:7px;font-size:14px;cursor:pointer}.svp .label.tint{filter:opacity(.4)}.svp .label .marker{all:unset;width:7px;height:7px;margin-right:6px}.svp .buttons{all:unset;display:flex;align-items:stretch;gap:3px;flex-wrap:wrap}.svp .tblock.active{fill:var(--active);stroke:#000;stroke-width:3}.svp .button{all:unset;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--grid);border-radius:7px;padding:2px;width:16px;height:16px;font-size:11px}.svp .button.active{border:1px solid var(--font)}.svp .button:hover{border:1px solid var(--font)}.svp .none{display:none}.svp .dots{all:unset;display:flex;align-items:center;justify-content:center;cursor:pointer;padding-left:7px;padding-right:2px}`;
}

//#region function
function downloadSVG(svg) {
    svg.style.width = svg.clientWidth + 'px';
    svg.style.height = svg.clientHeight + 'px';
    let ser = new XMLSerializer();
    let link = document.createElement('a');
    link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(ser.serializeToString(svg));
    link.download = 'plot.svg';
    link.click();
    svg.style.width = '100%';
    svg.style.height = '100%';
}

const getColorIdx = (idx, s, v) => hsl2rgb(idx * 260 + 0, s, v);

const makeText = (text, x, y, fill, size, attrs = {}, bold = false) => SVG.text(text, x, y,
    { fill: fill, ...attrs },
    { style: `font-size: ${size}px;font-weight:${bold ? 'bold' : 'unset'}` });

const makeLine = (x1, y1, x2, y2, stroke, strokew, attrs = {}) => SVG.line(x1, y1, x2, y2,
    { stroke: stroke, fill: 'none', 'stroke-width': strokew, ...attrs });

const makeIcon = (d) => SVG.svg(
    { viewBox: "0 0 24 24" },
    {
        style: 'width:24px;height:24px',
        child: SVG.path(d, {
            fill: 'none',
            stroke: 'var(--font)',
            'stroke-width': 2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
        }),
    });