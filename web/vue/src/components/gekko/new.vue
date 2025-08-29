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
import { post } from '../../tools/ajax'
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
      config: {}
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

      if(!this.existingMarketWatcher)
        return;

      if(!this.requiredHistoricalData)
        startAt = moment().utc().startOf('minute').format();
      else {
        // TODO: figure out whether we can stitch data
        // without looking at the existing watcher
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
  watch: {
    // start the stratrunner
    existingMarketWatcher: function(val, prev) {
      if(!this.pendingStratrunner)
        return;

      const gekko = this.existingMarketWatcher;

      if(gekko.events.latest.candle) {
        this.pendingStratrunner = false;

        this.startGekko((err, resp) => {
          this.$router.push({
            path: `/live-gekkos/${resp.id}`
          });
        });
      }
    }
  },
  methods: {
    updateConfig: function(config) {
      this.config = config;
    },
    start: function() {

      // if the user starts a tradebot we do some
      // checks first.
      if(this.config.type === 'tradebot') {
        if(this.existingTradebot) {
          let str = 'You already have a tradebot running on this exchange';
          str += ', you can only run one tradebot per exchange.';
          return alert(str);
        }

        // Only check for API keys if paper trading is disabled
        if(!this.config.paperTrader || !this.config.paperTrader.enabled) {
          if(!this.availableApiKeys.includes(this.exchange))
            return alert('Please first configure API keys for this exchange in the config page, or enable paper trading.')
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
            this.$router.push({
              path: `/live-gekkos/${resp.id}`
            });
          });
        }

      } else {

        if(this.existingMarketWatcher) {
          // the specified market is already being watched,
          // just start a gekko!
          this.startGekko(this.routeToGekko);
          
        } else {
          // the specified market is not yet being watched,
          // we need to create a watcher
          this.startWatcher((err, resp) => {
            this.pendingStratrunner = resp.id;
            // now we just wait for the watcher to be properly initialized
            // (see the `watch.existingMarketWatcher` method)
          });
        }
      }
    },
    routeToGekko: function(err, resp) {
      if(err || resp.error)
        return console.error(err, resp.error);

      this.$router.push({
        path: `/live-gekkos/${resp.id}`
      });
    },
    startWatcher: function(next) {
      post('startGekko', this.watchConfig, next);
    },
    startGekko: function(next) {
      post('startGekko', this.gekkoConfig, next);
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
