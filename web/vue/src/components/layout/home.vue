<template lang='pug'>
  section.contain.grd-row
    .grd-row-col-3-6(v-html='left')
    .grd-row-col-3-6.txt--center
      img(src='static/gekko.jpg')
      p
        em The most valuable commodity I know of is information.
      p
        | Current BTC price (USD):
        span(v-if='btcPrice !== null') {{ formatPrice(btcPrice) }}
        span(v-else) Loading...
</template>

<script>
import marked from '../../tools/marked';
import request from 'superagent';

const left = marked(`

## Gekko

Gekko is a Bitcoin trading bot and backtesting platform that
connects to popular Bitcoin exchanges. It is written in javascript
and runs on nodejs.

[Find out more](https://gekko.wizb.it/).

*Gekko is 100% free (open source), if you paid for this you have been scammed.*

`);

export default {
  data: () => {
    return {
      left,
      btcPrice: null
    }
  },
  created() {
    this.fetchPrice();
  },
  methods: {
    fetchPrice() {
      request
        .get('https://api.coindesk.com/v1/bpi/currentprice/USD.json')
        .then(res => {
          const data = JSON.parse(res.text);
          this.btcPrice = data.bpi.USD.rate_float;
        })
        .catch(() => {
          this.btcPrice = null;
        });
    },
    formatPrice(value) {
      return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
}
</script>
