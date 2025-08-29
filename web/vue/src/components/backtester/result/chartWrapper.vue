<template lang='pug'>
#chartWrapper(v-bind:class='{ clickable: !isClicked }')
  .shield(v-on:click.prevent='click')
  svg#chart(width='960', :height='height')
</template>

<script>

import chart from '../../../d3/chart4'
import { draw as drawMessage, clear as clearMessage } from '../../../d3/message'

const MIN_CANDLES = 4;

export default {
  props: ['data', 'height'],

  data: function() {
    return {
      isClicked: false
    }
  },

  watch: {
    data: function() { this.render() },
  },

  created: function() { setTimeout( this.render, 100) },
  beforeDestroy: function() {
    this.remove();
  },

  methods: {
    click: function() {
      this.isClicked = true;
    },
    render: function() {
      this.remove();

      if(_.size(this.data.candles) < MIN_CANDLES) {
        drawMessage('Not enough data to spawn chart');
      } else {
        chart(this.data.candles, this.data.trades, this.height);
      }
    },
    remove: function() {
      d3.select('#chart').html('');
    }
  }
}
</script>

<style>
/* Professional Trading Platform Styling */

#chartWrapper.clickable {
  position: relative;
}

#chartWrapper.clickable .shield {
  cursor: zoom-in;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(30, 34, 45, 0.1);
  opacity: 0.1;
}

#chart {
  background-color: #1e222d;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#chart circle {
  clip-path: url(#clip);
}

#chart .zoom {
  cursor: move;
  fill: none;
  pointer-events: all;
}

/* Professional line styling */
#chart .line {
  fill: none;
  stroke: #2196f3;
  stroke-width: 1.5px;
  clip-path: url(#clip);
}

/* Grid styling */
#chart .grid line {
  stroke: #2a2e39;
  stroke-opacity: 0.7;
  stroke-width: 0.5px;
}

#chart .grid path {
  stroke-width: 0;
}

/* Axis styling */
#chart .axis line {
  stroke: #363a45;
  stroke-width: 1px;
}

#chart .axis path {
  stroke: #363a45;
  stroke-width: 1px;
}

#chart .axis text {
  fill: #787b86;
  font-size: 11px;
  font-weight: 500;
}

#chart .axis.axis--y text, #chart .axis.axis--y-volume text {
  fill: #fff !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  stroke: none !important;
  filter: none !important;
}

/* Candlestick styling */
#chart .candlestick .wick {
  stroke-width: 1px;
}

#chart .candlestick .body {
  stroke-width: 0.5px;
}

/* Trade markers */
#chart circle.trade {
  clip-path: url(#clip);
}

#chart circle.buy {
  fill: #26a69a;
  stroke: #1e222d;
  stroke-width: 2px;
}

#chart circle.sell {
  fill: #ef5350;
  stroke: #1e222d;
  stroke-width: 2px;
}

/* Crosshair styling */
#chart .crosshair line {
  stroke: #787b86;
  stroke-width: 0.5px;
  stroke-dasharray: 3,3;
  opacity: 0.8;
}

/* Brush styling */
#chart .brush .selection {
  fill: #2196f3;
  fill-opacity: 0.3;
  stroke: #2196f3;
  stroke-width: 1px;
}

#chart .brush .handle {
  fill: #2196f3;
  stroke: #1e222d;
  stroke-width: 1px;
}

/* Volume bars */
#chart .volume rect {
  fill: #4caf50;
  opacity: 0.7;
}

/* Professional tooltip */
.chart-tooltip {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  padding: 12px 16px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
  border: 1px solid #363a45 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  backdrop-filter: blur(10px) !important;
  z-index: 1000 !important;
  line-height: 1.4 !important;
  pointer-events: none;
  transition: opacity 0.2s;
  opacity: 1;
}

.chart-tooltip.hidden {
  opacity: 0;
  display: none !important;
}

.chart-tooltip div {
  margin: 2px 0 !important;
}

.chart-tooltip strong {
  color: #ffffff !important;
  font-weight: 600 !important;
}

/* Responsive design */
@media (max-width: 768px) {
  #chart {
    font-size: 10px;
  }
  
  #chart .axis text {
    font-size: 9px;
  }
  
  .chart-tooltip {
    font-size: 11px !important;
    padding: 8px 12px !important;
  }
}

/* Animation for smooth transitions */
#chart .candlestick,
#chart .trade,
#chart .line {
  transition: opacity 0.2s ease-in-out;
}

#chart .candlestick:hover,
#chart .trade:hover {
  opacity: 0.8;
}

/* Professional scrollbar for webkit browsers */
#chartWrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

#chartWrapper::-webkit-scrollbar-track {
  background: #1e222d;
}

#chartWrapper::-webkit-scrollbar-thumb {
  background: #363a45;
  border-radius: 4px;
}

#chartWrapper::-webkit-scrollbar-thumb:hover {
  background: #4a4e59;
}
</style>
