# SVPlot.js
Очень лёгкий (~7 kB gzip) плоттер для JS
- 2 типа графиков: линии и timeline (начало и конец работы)
- График линии может быть статичным (время точек указано вручную) и динамичным (время браузера)
- Любое количество осей
- Режим общего масштаба и отдельного для каждой оси
- Возможность отключения отображения осей
- Полноэкранный режим
- Тёмная и светлая темы
- Скачивание в формате SVG
- Режим перемещения графика и измерения диапазона
- Полная поддержка управления с тачскрина

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

// clear plot data
clearData();

// stretch plot to fill window
fitData();

// move right and shift on new data
autoData();

// release resizer
release();
```

## Создание
```html
<body>
    <div id="plot"></div>
</body>

<script>
    let plot = new SVPlot(document.getElementById('plot'), {});
</script>
```

## Типы
### running
Автоматически движется с указанным периодом в конфиге `{period: 200}`, сохраняя крайнее правое значение равным предыдущему. Время точек (ось x) берёт текущее из браузера. `setData` принимает данные в формате массива со значениями осей: `[ y0, y1, .. ]`.

### stack
Движется при добавлении новых данных. Время точек (ось x) берёт текущее из браузера. `setData` принимает данные в формате массива со значениями осей: `[ y0, y1.. ]`.

### plot
Выводит точки с указанным временем по оси x. `setData` принимает данные в формате `{ t0: [y0, y1..], .. }`. Формат времени:

- UNIX в секундах или миллисекундах: на графике будет отображаться как дата и время
- Просто время в миллисекундах, **начиная с 0** (первая точка): на графике будет отображаться как время в секундах, начиная с 0 секунд

### timeline
Выводит блоки "начала и окончания работы" с указанным временем по оси x. `setData` принимает данные в формате `{ t0: [y0, ..], .. }` или `{ t0: {y0:state, y2:state}, .. }`. Формат времени:

- UNIX в секундах или миллисекундах: на графике будет отображаться как дата и время
- Просто время в миллисекундах, **начиная с 0** (первая точка): на графике будет отображаться как время в секундах, начиная с 0 секунд