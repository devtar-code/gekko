<template lang='pug'>
  .strategy-config-container
    .config-section
      .section-header
        i.fas.fa-chart-line
        h3 Market Configuration
      .config-grid
        .config-item
          label Exchange
          select(v-model='config.watch.exchange', @change='updateConfig')
            option(value='binance') Binance
            option(value='bitfinex') Bitfinex
            option(value='kraken') Kraken
            option(value='gdax') Coinbase Pro
            option(value='poloniex') Poloniex
        .config-item
          label Asset
          input(type='text', v-model='config.watch.asset', placeholder='BTC', @input='updateConfig')
        .config-item
          label Currency
          input(type='text', v-model='config.watch.currency', placeholder='USDT', @input='updateConfig')
        .config-item
          label Candle Size (minutes)
          select(v-model='config.tradingAdvisor.candleSize', @change='updateConfig')
            option(value='1') 1 minute
            option(value='5') 5 minutes
            option(value='15') 15 minutes
            option(value='30') 30 minutes
            option(value='60') 1 hour
            option(value='240') 4 hours
            option(value='1440') 1 day

    .config-section
      .section-header
        i.fas.fa-shield-alt
        h3 Risk Profile
      .risk-profiles
        .risk-profile(:class="{ active: selectedRiskProfile === 'conservative' }", @click='selectRiskProfile("conservative")')
          .risk-icon
            i.fas.fa-shield-alt
          .risk-info
            h4 Conservative
            p Low risk, steady returns
            .risk-details
              span Max Position Size: 5%
              span Stop Loss: 2%
        .risk-profile(:class="{ active: selectedRiskProfile === 'moderate' }", @click='selectRiskProfile("moderate")')
          .risk-icon
            i.fas.fa-balance-scale
          .risk-info
            h4 Moderate
            p Balanced risk and return
            .risk-details
              span Max Position Size: 10%
              span Stop Loss: 5%
        .risk-profile(:class="{ active: selectedRiskProfile === 'aggressive' }", @click='selectRiskProfile("aggressive")')
          .risk-icon
            i.fas.fa-rocket
          .risk-info
            h4 Aggressive
            p High risk, high potential
            .risk-details
              span Max Position Size: 20%
              span Stop Loss: 10%

    .config-section
      .section-header
        i.fas.fa-robot
        h3 Trading Strategy
      .strategy-selector
        .strategy-option(:class="{ active: config.tradingAdvisor.method === 'MACD' }", @click='selectStrategy("MACD")')
          .strategy-icon
            i.fas.fa-chart-line
          .strategy-info
            h4 MACD
            p Moving Average Convergence Divergence
            .strategy-tags
              span.tag Trend Following
              span.tag Momentum
        .strategy-option(:class="{ active: config.tradingAdvisor.method === 'RSI' }", @click='selectStrategy("RSI")')
          .strategy-icon
            i.fas.fa-chart-area
          .strategy-info
            h4 RSI
            p Relative Strength Index
            .strategy-tags
              span.tag Mean Reversion
              span.tag Oscillator
        .strategy-option(:class="{ active: config.tradingAdvisor.method === 'CCI' }", @click='selectStrategy("CCI")')
          .strategy-icon
            i.fas.fa-chart-bar
          .strategy-info
            h4 CCI
            p Commodity Channel Index
            .strategy-tags
              span.tag Momentum
              span.tag Volatility
        .strategy-option(:class="{ active: config.tradingAdvisor.method === 'PPO' }", @click='selectStrategy("PPO")')
          .strategy-icon
            i.fas.fa-percentage
          .strategy-info
            h4 PPO
            p Percentage Price Oscillator
            .strategy-tags
              span.tag Trend Following
              span.tag Momentum

    .config-section(v-if='config.tradingAdvisor.method')
      .section-header
        i.fas.fa-sliders-h
        h3 Strategy Parameters
      .strategy-params
        .param-group(v-if='config.tradingAdvisor.method === "MACD"')
          .param-item
            label Short Period
            input(type='number', v-model='config.MACD.short', min='1', max='50', @input='updateConfig')
          .param-item
            label Long Period
            input(type='number', v-model='config.MACD.long', min='1', max='100', @input='updateConfig')
          .param-item
            label Signal Period
            input(type='number', v-model='config.MACD.signal', min='1', max='50', @input='updateConfig')
        .param-group(v-if='config.tradingAdvisor.method === "RSI"')
          .param-item
            label Period
            input(type='number', v-model='config.RSI.interval', min='5', max='50', @input='updateConfig')
          .param-item
            label Oversold Level
            input(type='number', v-model='config.RSI.thresholds.low', min='10', max='40', @input='updateConfig')
          .param-item
            label Overbought Level
            input(type='number', v-model='config.RSI.thresholds.high', min='60', max='90', @input='updateConfig')

    .config-section
      .section-header
        i.fas.fa-wallet
        h3 Trading Settings
      .trading-settings
        .trading-mode-toggle
          .toggle-header
            h4 Trading Mode
            .mode-switch
              .switch-option(:class="{ active: config.paperTrader.enabled }", @click='enablePaperTrading')
                i.fas.fa-graduation-cap
                span Paper Trading
              .switch-option(:class="{ active: !config.paperTrader.enabled }", @click='enableRealTrading')
                i.fas.fa-coins
                span Real Trading
          .mode-description
            p(v-if='config.paperTrader.enabled')
              i.fas.fa-info-circle
              span Test strategies safely without real money or API keys
            p(v-else)
              i.fas.fa-key
              span Trade with real money using API keys
        .paper-trading-settings(v-if='config.paperTrader.enabled')
          .setting-item
            label Initial Balance ({{ config.watch.currency }})
            input(type='number', v-model='config.paperTrader.simulationBalance.currency', min='100', step='100', @input='updateConfig')
          .setting-item
            label Initial {{ config.watch.asset }} Balance
            input(type='number', v-model='config.paperTrader.simulationBalance.asset', min='0.001', step='0.001', @input='updateConfig')
        .real-trading-settings(v-if='!config.paperTrader.enabled')
          .api-key-info
            p 
              i.fas.fa-key
              span Real trading requires API keys. Configure them in the 
              a(href='#/config', target='_blank') Config page
              span .
          .api-key-status
            .status-item
              i.fas(:class="hasApiKey ? 'fa-check-circle' : 'fa-times-circle'")
              span API Key: {{ hasApiKey ? 'Configured' : 'Not Found' }}
            .status-item
              i.fas(:class="hasSecretKey ? 'fa-check-circle' : 'fa-times-circle'")
              span Secret Key: {{ hasSecretKey ? 'Configured' : 'Not Found' }}

    .config-section
      .section-header
        i.fas.fa-chart-pie
        h3 Performance Analysis
      .performance-settings
        .setting-item
          label Enable Performance Analyzer
          .toggle-switch
            input(type='checkbox', v-model='config.performanceAnalyzer.enabled', @change='updateConfig')
            .slider
        .setting-item(v-if='config.performanceAnalyzer.enabled')
          label Risk-Free Return Rate (%)
          input(type='number', v-model='config.performanceAnalyzer.riskFreeReturn', min='0', max='20', step='0.1', @input='updateConfig')

    .config-section
      .section-header
        i.fas.fa-check-circle
        h3 Configuration Status
      .status-indicator(:class="{ valid: config.valid, invalid: !config.valid }")
        .status-icon
          i.fas(:class="config.valid ? 'fa-check-circle' : 'fa-exclamation-circle'")
        .status-text
          h4 {{ config.valid ? 'Configuration Ready' : 'Configuration Incomplete' }}
          p {{ config.valid ? 'All required fields are filled. You can now start your Gekko!' : 'Please fill in all required fields to continue.' }}

</template>

<script>
export default {
  data: () => {
    return {
      selectedRiskProfile: 'moderate',
      config: {
        valid: true,
        type: 'tradebot',
        watch: {
          exchange: 'binance',
          currency: 'USDT',
          asset: 'BTC'
        },
        tradingAdvisor: {
          enabled: true,
          method: 'MACD',
          candleSize: 60,
          historySize: 10
        },
        MACD: {
          short: 10,
          long: 21,
          signal: 9,
          thresholds: {
            down: -0.025,
            up: 0.025,
            persistence: 1
          }
        },
        RSI: {
          interval: 14,
          thresholds: {
            low: 30,
            high: 70,
            persistence: 1
          }
        },
        CCI: {
          constant: 0.015,
          history: 90,
          thresholds: {
            up: 100,
            down: -100,
            persistence: 0
          }
        },
        PPO: {
          short: 12,
          long: 26,
          signal: 9,
          thresholds: {
            down: -0.025,
            up: 0.025,
            persistence: 2
          }
        },
        paperTrader: {
          enabled: true,
          reportInCurrency: true,
          simulationBalance: {
            asset: 1,
            currency: 1000
          },
          feeMaker: 0.15,
          feeTaker: 0.25,
          feeUsing: 'maker',
          slippage: 0.05
        },
        performanceAnalyzer: {
          enabled: true,
          riskFreeReturn: 5
        }
      }
    }
  },
  methods: {
    selectRiskProfile(profile) {
      this.selectedRiskProfile = profile;
      this.applyRiskProfile(profile);
      this.updateConfig();
    },
    applyRiskProfile(profile) {
      const profiles = {
        conservative: {
          maxPositionSize: 0.05,
          stopLoss: 0.02,
          candleSize: 60,
          historySize: 20
        },
        moderate: {
          maxPositionSize: 0.10,
          stopLoss: 0.05,
          candleSize: 30,
          historySize: 15
        },
        aggressive: {
          maxPositionSize: 0.20,
          stopLoss: 0.10,
          candleSize: 15,
          historySize: 10
        }
      };
      
      const settings = profiles[profile];
      this.config.tradingAdvisor.candleSize = settings.candleSize;
      this.config.tradingAdvisor.historySize = settings.historySize;
    },
    selectStrategy(strategy) {
      this.config.tradingAdvisor.method = strategy;
      this.updateConfig();
    },
    updateConfig() {
      // Validate the configuration
      this.config.valid = this.validateConfig();
      this.$emit('config', this.config);
    },
    validateConfig() {
      // Basic validation - ensure required fields are present
      const basicValidation = !!(
        this.config.watch.exchange &&
        this.config.watch.asset &&
        this.config.watch.currency &&
        this.config.tradingAdvisor.method
      );
      
      // If real trading is enabled, also check for API keys
      if (!this.config.paperTrader.enabled) {
        return basicValidation && this.hasApiKey && this.hasSecretKey;
      }
      
      return basicValidation;
    },
    enablePaperTrading() {
      this.config.paperTrader.enabled = true;
      this.updateConfig();
    },
    enableRealTrading() {
      this.config.paperTrader.enabled = false;
      this.updateConfig();
    }
  },
  computed: {
    hasApiKey() {
      // Check if API key is configured for the selected exchange
      const apiKeys = this.$store.state.apiKeys || [];
      return apiKeys.includes(this.config.watch.exchange);
    },
    hasSecretKey() {
      // For now, assume if API key exists, secret key also exists
      // In a real implementation, you'd check the actual API key configuration
      return this.hasApiKey;
    }
  },
  mounted() {
    this.updateConfig();
  }
}
</script>

<style scoped>
.strategy-config-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.config-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.section-header i {
  color: #00d4aa;
  font-size: 1.2rem;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-weight: 600;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.config-item input,
.config-item select {
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.config-item input:focus,
.config-item select:focus {
  outline: none;
  border-color: #00d4aa;
  box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
}

.risk-profiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.risk-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.risk-profile:hover {
  border-color: #00d4aa;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.risk-profile.active {
  border-color: #00d4aa;
  background: linear-gradient(135deg, #f8fffe 0%, #e6fffa 100%);
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
}

.risk-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4aa, #0099cc);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.risk-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  font-weight: 600;
}

.risk-info p {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.risk-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #495057;
}

.strategy-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.strategy-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.strategy-option:hover {
  border-color: #00d4aa;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.strategy-option.active {
  border-color: #00d4aa;
  background: linear-gradient(135deg, #f8fffe 0%, #e6fffa 100%);
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
}

.strategy-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.strategy-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  font-weight: 600;
}

.strategy-info p {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.strategy-tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.strategy-params {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.param-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-item label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.param-item input {
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.param-item input:focus {
  outline: none;
  border-color: #00d4aa;
  box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
}

.trading-settings,
.performance-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.setting-item label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.setting-item input[type="number"] {
  width: 120px;
  padding: 0.5rem;
  border: 2px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.9rem;
}

.toggle-switch {
  position: relative;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #00d4aa;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.paper-trading-info {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 6px;
  color: #2d5a2d;
}

.paper-trading-info p {
  margin: 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.paper-trading-info i {
  color: #28a745;
}

.trading-mode-toggle {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.toggle-header h4 {
  margin: 0;
  color: #2c3e50;
  font-weight: 600;
  font-size: 1rem;
}

.mode-switch {
  display: flex;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.switch-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6c757d;
  min-width: 120px;
  justify-content: center;
}

.switch-option:hover {
  background: #f8f9fa;
  color: #495057;
}

.switch-option.active {
  background: linear-gradient(135deg, #00d4aa, #0099cc);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 212, 170, 0.3);
}

.switch-option i {
  font-size: 1rem;
}

.mode-description {
  margin-top: 0.75rem;
}

.mode-description p {
  margin: 0;
  font-size: 0.85rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-description i {
  color: #00d4aa;
  font-size: 0.9rem;
}

.paper-trading-settings,
.real-trading-settings {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.api-key-info {
  margin-bottom: 1rem;
}

.api-key-info {
  margin-bottom: 1rem;
}

.api-key-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.api-key-info a {
  color: #0056b3;
  text-decoration: none;
  font-weight: 600;
}

.api-key-info a:hover {
  text-decoration: underline;
}

.api-key-status {
  display: flex;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.status-item i.fa-check-circle {
  color: #28a745;
}

.status-item i.fa-times-circle {
  color: #dc3545;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  transition: all 0.3s ease;
}

.status-indicator.valid {
  border-color: #28a745;
  background: linear-gradient(135deg, #f8fff9 0%, #e6ffe6 100%);
}

.status-indicator.invalid {
  border-color: #dc3545;
  background: linear-gradient(135deg, #fff8f8 0%, #ffe6e6 100%);
}

.status-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.status-indicator.valid .status-icon {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
}

.status-indicator.invalid .status-icon {
  background: linear-gradient(135deg, #dc3545, #fd7e14);
  color: white;
}

.status-text h4 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.status-text p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .strategy-config-container {
    padding: 1rem;
  }
  
  .config-grid,
  .risk-profiles,
  .strategy-selector {
    grid-template-columns: 1fr;
  }
  
  .strategy-params {
    grid-template-columns: 1fr;
  }
  
  .param-group {
    grid-template-columns: 1fr;
  }
}
</style>
