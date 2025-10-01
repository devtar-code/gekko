import _ from 'lodash';
// global moment

export default function(_data, _trades, _height) {
  // Professional trading platform colors
  const colors = {
    background: '#1e222d',
    grid: '#2a2e39',
    text: '#d1d4dc',
    textSecondary: '#787b86',
    border: '#363a45',
    up: '#26a69a',
    down: '#ef5350',
    volume: '#4caf50',
    line: '#2196f3',
    tooltip: '#2a2e39',
    crosshair: '#787b86'
  };

  const toDate = i => {
    if(_.isNumber(i)) {
      return moment.unix(i).utc().toDate();
    } else {
      return moment.utc(i).toDate();
    }
  }

  // Transform data for candlestick chart
  const candlestickData = _data.map(c => {
    return {
      date: toDate(c.start),
      open: +c.open,
      high: +c.high,
      low: +c.low,
      close: +c.close,
      volume: +c.volume
    }
  });

  const trades = _trades.map(t => {
    return {
      price: t.price,
      date: toDate(t.date),
      action: t.action
    }
  });

  // Calculate OHLC for line chart
  const lineData = candlestickData.map(c => ({
    date: c.date,
    price: c.close
  }));

  var svg = d3.select("#chart");
  svg.attr("width", window.innerWidth - 20);

  // Professional margins
  var margin = {top: 30, right: 50, bottom: 120, left: 60};
  var height = _height - margin.top - margin.bottom;
  var margin2 = {top: _height - 80, right: 50, bottom: 40, left: 60};
  var width = +svg.attr("width") - margin.left - margin.right;
  var height2 = _height - margin2.top - margin2.bottom;

  // Clear previous chart
  svg.selectAll("*").remove();

  // Scales
  var x = d3.scaleUtc().range([0, width]),
      x2 = d3.scaleUtc().range([0, width]),
      y = d3.scaleLinear().range([height, 0]),
      y2 = d3.scaleLinear().range([height2, 0]),
      yVolume = d3.scaleLinear().range([height2, 0]);

  // Axes with professional styling
  var xAxis = d3.axisBottom(x)
      .tickFormat(d3.timeFormat("%H:%M"))
      .tickSize(-height)
      .tickPadding(10);

  var xAxis2 = d3.axisBottom(x2)
      .tickFormat(d3.timeFormat("%m/%d"))
      .tickSize(-height2)
      .tickPadding(10);

  var yAxis = d3.axisLeft(y)
      .tickFormat(d3.format(",.2f"))
      .tickSize(-width)
      .tickPadding(10);

  var yVolumeAxis = d3.axisLeft(yVolume)
      .tickFormat(d3.format(",.0f"))
      .tickSize(-width)
      .tickPadding(10);

  // Brush and zoom
  var brush = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on("brush end", brushed);

  var zoom = d3.zoom()
      .scaleExtent([1, 50])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on("zoom", zoomed);

  // Candlestick generator
  var candlestick = function(g) {
    g.each(function(d) {
      var g = d3.select(this);
      
      // Wick
      g.append("line")
          .attr("class", "wick")
          .attr("x1", x(d.date))
          .attr("x2", x(d.date))
          .attr("y1", y(d.high))
          .attr("y2", y(d.low))
          .style("stroke", d.close >= d.open ? colors.up : colors.down)
          .style("stroke-width", 1);

      // Body
      var bodyHeight = Math.abs(y(d.close) - y(d.open));
      var bodyY = d.close >= d.open ? y(d.close) : y(d.open);
      
      g.append("rect")
          .attr("class", "body")
          .attr("x", x(d.date) - 2)
          .attr("y", bodyY)
          .attr("width", 4)
          .attr("height", Math.max(bodyHeight, 1))
          .style("fill", d.close >= d.open ? colors.up : colors.down)
          .style("stroke", colors.border)
          .style("stroke-width", 0.5);
    });
  };

  // Volume bars
  var volumeBars = function(g) {
    g.each(function(d) {
      var g = d3.select(this);
      g.append("rect")
          .attr("x", x2(d.date) - 1)
          .attr("y", yVolume(d.volume))
          .attr("width", 2)
          .attr("height", height2 - yVolume(d.volume))
          .style("fill", colors.volume)
          .style("opacity", 0.7);
    });
  };

  // Line generator
  var line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.price))
      .curve(d3.curveMonotoneX);

  var line2 = d3.line()
      .x(d => x2(d.date))
      .y(d => y2(d.price))
      .curve(d3.curveMonotoneX);

  // Clip path
  svg.append("defs").append("clipPath")
      .attr("id", "clip")
    .append("rect")
      .attr("width", width)
      .attr("height", height);

  // Main chart area
  var focus = svg.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Context area (mini chart)
  var context = svg.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  // Set domains
  x.domain(d3.extent(candlestickData, d => d.date));
  y.domain([
    d3.min(candlestickData, d => d.low) * 0.9995,
    d3.max(candlestickData, d => d.high) * 1.0005
  ]);
  x2.domain(x.domain());
  y2.domain(y.domain());
  yVolume.domain([0, d3.max(candlestickData, d => d.volume) * 1.1]);

  // Grid lines
  focus.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis.tickSize(-height).tickFormat(""));

  focus.append("g")
      .attr("class", "grid")
      .call(yAxis.tickSize(-width).tickFormat(""));

  // Candlesticks
  focus.selectAll(".candlestick")
      .data(candlestickData)
      .enter().append("g")
      .attr("class", "candlestick")
      .call(candlestick);

  // Trade markers
  focus.selectAll(".trade")
      .data(trades)
      .enter().append("circle")
      .attr("class", d => "trade " + d.action)
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.price))
      .attr("r", 4)
      .style("fill", d => d.action === 'buy' ? colors.up : colors.down)
      .style("stroke", colors.background)
      .style("stroke-width", 2);

  // Axes
  focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

  // Context chart
  context.append("path")
      .datum(lineData)
      .attr("class", "line")
      .attr("d", line2);

  // Volume bars in context
  context.selectAll(".volume")
      .data(candlestickData)
      .enter().append("g")
      .attr("class", "volume")
      .call(volumeBars);

  // Context axes
  context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

  // Render the volume axis with only one tick and no grid lines
  const maxVolume = d3.max(candlestickData, d => d.volume) || 0;
  yVolumeAxis.tickValues([maxVolume]);

  // Remove any previous axis rendering for yVolumeAxis
  context.selectAll('g.axis.axis--y-volume').data([null]).exit().remove();

  // Brush
  context.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, x.range());

  // Zoom area
  svg.append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoom);

  // Crosshair
  var crosshair = focus.append("g")
      .attr("class", "crosshair")
      .style("display", "none");

  crosshair.append("line")
      .attr("class", "crosshair-x")
      .attr("y1", 0)
      .attr("y2", height);

  crosshair.append("line")
      .attr("class", "crosshair-y")
      .attr("x1", 0)
      .attr("x2", width);

  // Create or select the tooltip div ONCE
  let tooltip = d3.select('body').select('.chart-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', colors.tooltip)
      .style('color', colors.text)
      .style('padding', '12px 16px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('font-family', 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace')
      .style('border', '1px solid ' + colors.border)
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.4)')
      .style('backdrop-filter', 'blur(10px)')
      .style('z-index', '1000')
      .style('line-height', '1.4')
      .style('pointer-events', 'none')
      .style('transition', 'opacity 0.2s')
      .style('opacity', '1');
  }

  // Helper to draw current price line/label
  function drawCurrentPrice() {
    focus.selectAll('.current-price-line').remove();
    focus.selectAll('.current-price-label').remove();
    if (currentPrice) {
      focus.append('line')
        .attr('class', 'current-price-line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(currentPrice))
        .attr('y2', y(currentPrice))
        .style('stroke', '#FFD600')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6,3');
      focus.append('text')
        .attr('class', 'current-price-label')
        .attr('x', width - 10)
        .attr('y', y(currentPrice) - 8)
        .attr('text-anchor', 'end')
        .style('fill', '#FFD600')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(`BTC/USD: $${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    }
  }

  // Fetch current BTC price (USD) from Coingecko
  let currentPrice = null;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', false);
  try {
    xhr.send(null);
    if (xhr.status === 200) {
      const json = JSON.parse(xhr.responseText);
      currentPrice = json.bitcoin.usd;
    }
  } catch (e) {}

  // After drawing axes and candlesticks, overlay current price if available
  drawCurrentPrice();

  // Attach mouse events to the SVG for tooltip/crosshair
  svg.on('mousemove', function() {
    var mouse = d3.mouse(this);
    // Only show tooltip if mouse is in the main chart area (not context)
    if (
      mouse[0] >= margin.left && mouse[0] <= margin.left + width &&
      mouse[1] >= margin.top && mouse[1] <= margin.top + height
    ) {
      crosshair.style('display', null);
      tooltip.style('visibility', 'visible').style('opacity', '1');
      
      var x0 = x.invert(mouse[0] - margin.left);
      var bisect = d3.bisector(d => d.date).left;
      var i = bisect(candlestickData, x0, 1);
      
      if (i > 0 && i < candlestickData.length) {
        var d0 = candlestickData[i - 1];
        var d1 = candlestickData[i];
        var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        
        crosshair.select('.crosshair-x').attr('transform', 'translate(' + x(d.date) + ',0)');
        crosshair.select('.crosshair-y').attr('transform', 'translate(0,' + y(d.close) + ')');
        
        tooltip.html(`
          <div><strong>${moment(d.date).format('MMM DD, YYYY HH:mm')}</strong></div>
          <div>O: $${d.open.toFixed(2)}</div>
          <div>H: $${d.high.toFixed(2)}</div>
          <div>L: $${d.low.toFixed(2)}</div>
          <div>C: $${d.close.toFixed(2)}</div>
          <div>V: ${d.volume.toLocaleString()}</div>
        `)
          .style('left', (d3.event.pageX + 10) + 'px')
          .style('top', (d3.event.pageY - 10) + 'px');
      }
    } else {
      crosshair.style('display', 'none');
      tooltip.style('visibility', 'hidden').style('opacity', '0');
    }
  })
  .on('mouseleave', function() {
    crosshair.style('display', 'none');
    tooltip.style('visibility', 'hidden').style('opacity', '0');
  });
  // Remove .zoom mouse events (handled by SVG now)
  svg.select('.zoom').on('.zoom', null);

  // In brushed and zoomed, always redraw current price and keep tooltip logic
  function brushed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return;
    var s = d3.event.selection || x2.range();
    x.domain(s.map(x2.invert, x2));
    updateChart();
    drawCurrentPrice();
    tooltip.style('visibility', 'hidden').classed('hidden', true);
  }
  function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return;
    var t = d3.event.transform;
    x.domain(t.rescaleX(x2).domain());
    updateChart();
    context.select('.brush').call(brush.move, x.range().map(t.invertX, t));
    drawCurrentPrice();
    tooltip.style('visibility', 'hidden').classed('hidden', true);
  }

  // Limit number of Y axis ticks for clarity
  yAxis.ticks(7);
  // Set yVolumeAxis to only show the max value
  yVolumeAxis.tickValues([maxVolume]);

  function updateChart() {
    // Update candlesticks
    focus.selectAll(".candlestick")
        .select(".wick")
        .attr("x1", d => x(d.date))
        .attr("x2", d => x(d.date))
        .attr("y1", d => y(d.high))
        .attr("y2", d => y(d.low));

    focus.selectAll(".candlestick")
        .select(".body")
        .attr("x", d => x(d.date) - 2)
        .attr("y", d => d.close >= d.open ? y(d.close) : y(d.open))
        .attr("height", d => Math.max(Math.abs(y(d.close) - y(d.open)), 1));

    // Update trade markers
    focus.selectAll(".trade")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.price));

    // Update axes
    focus.select(".axis--x").call(xAxis);
    focus.select(".axis--y").call(yAxis);
  }
}