This is an automatic translation and may be incorrect in some places. See the source README and examples for authoritative information.

# SVPlot.js
Very lightweight (~7 kB gzip) plotter for JS
- 2 types of schedules: lines and timeline (beginning and end of work)
- Line graphs can be static (dot times are manually specified) and dynamic (browser time)
- Any number of axles
- Mode of general scale and separate for each axle
- Ability to disable axle display
- Full screen mode
- Dark and light themes
- Download in SVG format
- Mode of moving the graph and measuring the range
- Full control support with touchscreen

[demo](https://gyverlibs.github.io/SVPlot.js/test/)

![svplot](/svplot.webp)

> **Browser**: https://gyverlibs.github.io/SVPlot.js/SVPlot.min.js

> **Node**: `npm i @alexgyver/SVPlot`

## SVPlot
```js
/**
 * @param {HTMLElement} parent 
 * @param {*} params dark: true|false, type: 'running|stack|plot|timeline', labels: [''], period: 200
 */
SVPlot(parent, params = {}, context = window);

/**
 * if sequence starts with 0 - will be displayed in seconds (add time in ms). If not 0 - unix date-time mode (add time in sec or ms)
 * @param {*} data 
 * running     [ y0, y1, .. ]
 * stack       [ y0, y1, .. ]
 * plot        { t0: [y0, ..], .. }
 * timeline    { t0: [y0, ..], .. } | { t0: {y0:state, y2:state}, .. }
 */
setData(data);

/**
 * @param {*} params dark: true|false, type: 'running|stack|plot|timeline', labels: [''], period: 200
 */
setConfig(params);

/**
 * @param {Array} labels
 */
setLabels(labels);

// clear plot data
clearData();

// stretch plot to fill window
fitData();

// move right and shift on new data
autoData();

// release resizer
release();

// set display range in seconds
setRange(range);
```

## Creation
```html
<body>
    <div id="plot"></div>
</body>

<script>
    let plot = new SVPlot(document.getElementById('plot'), {});
</script>
```

## Signatures
set in configuration or through`setLabels`string-plate`['label', 'label2']`. Opportunities:

- Indication of units of measurement in square brackets at the end of the line:`['label[%]', 'label2[ mm]']`
- Dashed line display - dash marks at the beginning of the line:`['-label', '---label2']`. The more dashes, the longer the strokes

## Types.
### running
Automatically moves with the specified period in config`{period: 200}`, keeping the extreme right value equal to the previous one. The point time (x-axis) takes the current from the browser.`setData`receives data in array format with values of axes:`[ y0, y1, .. ]`.

### stack
It moves when new data is added. The point time (x-axis) takes the current from the browser.`setData`receives data in array format with values of axes:`[ y0, y1.. ]`.

### plot
Deduces points with the specified time on the x-axis.`setData`receives data`{ t0: [y0, y1..], .. }`. Time format:

- UNIX in seconds or milliseconds: the graph will show as date and time
- Just time in milliseconds, **starting at 0** (first point): the graph will show as time in seconds starting at 0 seconds

### timeline
Outputs the blocks "beginning and ending" with the specified time on the x-axis.`setData`receives data`{ t0: [y0, ..], .. }`or`{ t0: {y0:state, y2:state}, .. }`. Time format:

- UNIX in seconds or milliseconds: the graph will show as date and time
- Just time in milliseconds, **starting at 0** (first point): the graph will show as time in seconds starting at 0 seconds
