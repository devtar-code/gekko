<template lang='pug'>
  div.contain.my2
    h3 Start a new gekko
    gekko-config-builder(v-on:config='updateConfig')
    .hr
    .txt--center
      .start-button-container
        button.w100--s.my1.btn--primary.start-btn(
          v-on:click='start', 
          v-if="!pendingStratrunner",
          :disabled="!config.valid"
        ) 
          i.fas.fa-rocket
          span {{ config.valid ? 'Start New Gekko' : 'Complete Configuration First' }}
        spinner(v-if='pendingStratrunner')
        .validation-message(v-if="!config.valid")
          p.txt--center Please complete all required fields in the configuration above to start a new Gekko.
        .paper-trading-note(v-if="config.valid && config.paperTrader && config.paperTrader.enabled")
          p.txt--center 
            i.fas.fa-info-circle
            span Paper trading mode enabled - no API keys required!
        .real-trading-note(v-if="config.valid && (!config.paperTrader || !config.paperTrader.enabled)")
          p.txt--center 
            i.fas.fa-coins
            span Real trading mode enabled - API keys required!
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import { post, get } from '../../tools/ajax'
import { bus } from '../global/ws'
import gekkoConfigBuilder from './gekkoConfigBuilder.vue'
import spinner from '../global/blockSpinner.vue'

export default {
  components: {
    gekkoConfigBuilder,
    spinner
  },
  data: () => {
    return {
      pendingStratrunner: false,
      config: {
        valid: false // Initialize with invalid state
      },
      waitForMarketStart: false,
      redirectFallbackTimer: null
    }
  },
  computed: {
    gekkos: function() {
      return this.$store.state.gekkos;
    },
    watchConfig: function() {
      let raw = _.pick(this.config, 'watch', 'candleWriter');
      let watchConfig = Vue.util.extend({}, raw);
      watchConfig.type = 'market watcher';
      watchConfig.mode = 'realtime';
      return watchConfig;
    },
    requiredHistoricalData: function() {
      if(!this.config.tradingAdvisor || !this.config.valid)
        return;

      let stratSettings = this.config.tradingAdvisor;
      return stratSettings.candleSize * stratSettings.historySize;
    },
    gekkoConfig: function() {
      var startAt;

      if(!this.requiredHistoricalData || !this.existingMarketWatcher) {
        startAt = moment().utc().startOf('minute').format();
      } else {
        const optimal = moment().utc().startOf('minute')
          .subtract(this.requiredHistoricalData, 'minutes')
          .unix();
        const available = moment
          .utc(this.existingMarketWatcher.events.initial.candle.start)
          .unix();
        startAt = moment.unix(Math.max(optimal, available)).utc().format();
      }

      const gekkoConfig = Vue.util.extend({
        market: {
          type: 'leech',
          from: startAt
        },
        mode: 'realtime'
      }, this.config);
      return gekkoConfig;
    },
    existingMarketWatcher: function() {
      const market = Vue.util.extend({}, this.watchConfig.watch);
      return _.find(this.gekkos, {config: {watch: market}});
    },
    exchange: function() {
      return this.watchConfig.watch.exchange;
    },
    existingTradebot: function() {
      return _.find(
        this.gekkos,
        g => {
          if(g.logType === 'tradebot' && g.config.watch.exchange === this.exchange) {
            return true;
          }

          return false;
        }
      );
    },
    availableApiKeys: function() {
      return this.$store.state.apiKeys;
    }
  },
  created() {
    // If we need to wait for a new watcher, start strat runner once marketStart arrives
    bus.$on('gekko_event', data => {
      if(!this.waitForMarketStart) return;
      if(!this.pendingStratrunner) return;
      if(!data || !data.event || data.id !== this.pendingStratrunner) return;
      if(data.event.type === 'marketStart') {
        this.waitForMarketStart = false;
        this.pendingStratrunner = false;
        this.startGekko(this.routeToGekko);
      }
    });
  },
  methods: {
    updateConfig: function(config) {
      this.config = config;
    },
    start: function() {
      console.log('=== START NEW GEKKO CLICKED ===');
      console.log('Config:', JSON.stringify(this.config, null, 2));
      console.log('Config type:', this.config.type);
      console.log('Available API keys:', this.availableApiKeys);

      // if the user starts a tradebot we do some
      // checks first.
      if(this.config.type === 'tradebot') {
        console.log('Starting tradebot...');
        if(this.existingTradebot) {
          let str = 'You already have a tradebot running on this exchange';
          str += ', you can only run one tradebot per exchange.';
          console.error('Error:', str);
          return alert(str);
        }

        // Only check for API keys if paper trading is disabled
        if(!this.config.paperTrader || !this.config.paperTrader.enabled) {
          console.log('Real trading mode - checking API keys...');
          if(!this.availableApiKeys.includes(this.exchange)) {
            console.error('No API keys found for exchange:', this.exchange);
            return alert('Please first configure API keys for this exchange in the config page, or enable paper trading.')
          }
        } else {
          console.log('Paper trading mode - no API keys needed');
        }
      }

      // internally a live gekko consists of two parts:
      //
      // - a market watcher
      // - a live gekko (strat runner + (paper) trader)
      //
      // however if the user selected type "market watcher"
      // the second part won't be created
      if(this.config.type === 'market watcher') {

        // check if the specified market is already being watched
        if(this.existingMarketWatcher) {
          alert('This market is already being watched, redirecting you now...');
          this.$router.push({
            path: `/live-gekkos/${this.existingMarketWatcher.id}`
          });
        } else {
          this.startWatcher((error, resp) => {
            if(error || !resp) return console.error(error || 'no response');
            this.$router.push({
              path: `/live-gekkos/${resp.id}`
            });
          });
        }

      } else {
        // Always start the strategy runner immediately; backend will create
        // a watcher automatically if needed.
        this.pendingStratrunner = true;
        // Setup a fallback redirect in case the API response parsing fails
        // or WS is delayed. Poll the list and route to the freshest runner.
        this.redirectFallbackTimer = setTimeout(() => {
          this.findNewestRunnerAndRoute();
        }, 4000);
        this.startGekko(this.routeToGekko);
      }
    },
    findNewestRunnerAndRoute: function() {
      // Always unlock the UI; allow user to click Start again even if nothing is found
      if(this.redirectFallbackTimer) {
        clearTimeout(this.redirectFallbackTimer);
        this.redirectFallbackTimer = null;
      }
      this.pendingStratrunner = false;
      this.waitForMarketStart = false;

      // Fetch /api/gekkos and route to the latest leech for selected market
      const watch = this.config.watch || {};
      const asset = watch.asset;
      const currency = watch.currency;
      const exchange = watch.exchange;
      get('gekkos', (err, resp) => {
        if(err || !resp || !resp.live) return;
        const all = Object.values(resp.live);
        const candidates = all.filter(g => g.type === 'leech' && g.config && g.config.watch &&
          g.config.watch.asset === asset && g.config.watch.currency === currency && g.config.watch.exchange === exchange);
        if(!candidates.length) return;
        const latest = candidates.sort((a,b) => new Date(b.start) - new Date(a.start))[0];
        if(latest && latest.id) {
          this.$router.push({ path: `/live-gekkos/${latest.id}` });
        }
      });
    },
    routeToGekko: function(err, resp) {
      console.log('=== ROUTE TO GEKKO ===');
      console.log('Error:', err);
      console.log('Response:', resp);
      
      if(err || (resp && resp.error)) {
        this.pendingStratrunner = false;
        this.waitForMarketStart = false;
        const errorMsg = (resp && resp.error) ? resp.error : (err ? err.message || err : 'Unknown error');
        console.error('Error starting Gekko:', errorMsg);
        alert('Error starting Gekko: ' + errorMsg);
        return;
      }

      if(!resp || !resp.id) {
        this.pendingStratrunner = false;
        this.waitForMarketStart = false;
        console.warn('No ID in response, trying fallback discovery...');
        // fallback: try to discover the created runner and route
        this.findNewestRunnerAndRoute();
        return;
      }

      console.log('Gekko started successfully with ID:', resp.id);
      this.pendingStratrunner = false;
      this.waitForMarketStart = false;
      if(this.redirectFallbackTimer) {
        clearTimeout(this.redirectFallbackTimer);
        this.redirectFallbackTimer = null;
      }
      this.$router.push({ path: `/live-gekkos/${resp.id}` });
    },
    startWatcher: function(next) {
      post('startGekko', this.watchConfig, next);
    },
    startGekko: function(next) {
      console.log('=== STARTING GEKKO ===');
      // Ensure we always send a fully shaped payload with correct types
      const payload = JSON.parse(JSON.stringify(this.gekkoConfig || {}));
      console.log('Initial payload:', payload);

      // Force numbers for candleSize/historySize if present
      if(payload && payload.tradingAdvisor) {
        if(typeof payload.tradingAdvisor.candleSize === 'string')
          payload.tradingAdvisor.candleSize = parseInt(payload.tradingAdvisor.candleSize, 10);
        if(typeof payload.tradingAdvisor.historySize === 'string')
          payload.tradingAdvisor.historySize = parseInt(payload.tradingAdvisor.historySize, 10);
        if(!payload.tradingAdvisor.method)
          payload.tradingAdvisor.method = 'MACD';
      }

      // Ensure paperTrader block exists when enabled toggle shown
      if(!payload.paperTrader) {
        payload.paperTrader = { enabled: true, simulationBalance: { asset: 1, currency: 1000 } };
      }

      console.log('Final payload being sent:', JSON.stringify(payload, null, 2));

      post('startGekko', payload, (err, resp) => {
        console.log('=== GEKKO START RESPONSE ===');
        console.log('Error:', err);
        console.log('Response:', resp);
        if (next) next(err, resp);
      });
    }
  }
}
</script>

<style scoped>
.start-button-container {
  margin-top: 2rem;
  padding: 1rem;
}

.start-btn {
  background: linear-gradient(135deg, #00d4aa, #0099cc);
  border: none;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 200px;
  margin: 0 auto;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
}

.start-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.start-btn i {
  font-size: 1.2rem;
}

.hr {
  border-top: 2px solid #e9ecef;
  margin: 2rem 0;
}

.contain {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h3 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
}

.validation-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  color: #856404;
}

.validation-message p {
  margin: 0;
  font-size: 0.9rem;
}

.paper-trading-note {
  margin-top: 1rem;
  padding: 1rem;
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 6px;
  color: #2d5a2d;
}

.paper-trading-note p {
  margin: 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.paper-trading-note i {
  color: #28a745;
}

.real-trading-note {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  color: #856404;
}

.real-trading-note p {
  margin: 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.real-trading-note i {
  color: #ffc107;
}
</style>
