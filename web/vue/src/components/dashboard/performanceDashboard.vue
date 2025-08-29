<template lang='pug'>
  .performance-dashboard
    .dashboard-header
      h2 Performance Analytics
      .time-filter
        select(v-model="selectedPeriod")
          option(value="1d") 1 Day
          option(value="7d") 7 Days
          option(value="30d") 30 Days
          option(value="90d") 90 Days
          option(value="1y") 1 Year
          option(value="all") All Time
    
    .metrics-grid
      .metric-card.primary
        .metric-value {{ formatCurrency(totalValue) }}
        .metric-label Total Portfolio Value
        .metric-change(:class="getChangeClass(totalReturn)")
          i(:class="getChangeIcon(totalReturn)")
          span {{ formatPercentage(totalReturn) }}
      
      .metric-card
        .metric-value {{ formatPercentage(totalReturn) }}
        .metric-label Total Return
        .metric-subtitle {{ formatCurrency(totalProfit) }}
      
      .metric-card
        .metric-value {{ sharpeRatio.toFixed(2) }}
        .metric-label Sharpe Ratio
        .metric-subtitle Risk-adjusted return
      
      .metric-card
        .metric-value {{ formatPercentage(maxDrawdown) }}
        .metric-label Max Drawdown
        .metric-subtitle Worst decline
      
      .metric-card
        .metric-value {{ (winRate * 100).toFixed(1) }}%
        .metric-label Win Rate
        .metric-subtitle {{ totalTrades }} trades
      
      .metric-card
        .metric-value {{ profitFactor.toFixed(2) }}
        .metric-label Profit Factor
        .metric-subtitle Gross profit / Gross loss
    
    .charts-section
      .chart-container
        h3 Portfolio Performance
        #portfolioChart.chart
      
      .chart-container
        h3 Risk Analysis
        #riskChart.chart
    
    .detailed-metrics
      .metrics-row
        .metric-group
          h4 Returns
          .metric-item
            span.label Daily Return
            span.value {{ formatPercentage(dailyReturn) }}
          .metric-item
            span.label Monthly Return
            span.value {{ formatPercentage(monthlyReturn) }}
          .metric-item
            span.label Annual Return
            span.value {{ formatPercentage(annualReturn) }}
        
        .metric-group
          h4 Risk Metrics
          .metric-item
            span.label Volatility
            span.value {{ formatPercentage(volatility) }}
          .metric-item
            span.label VaR (95%)
            span.value {{ formatPercentage(var95) }}
          .metric-item
            span.label Sortino Ratio
            span.value {{ sortinoRatio.toFixed(2) }}
        
        .metric-group
          h4 Trade Analysis
          .metric-item
            span.label Average Win
            span.value {{ formatCurrency(averageWin) }}
          .metric-item
            span.label Average Loss
            span.value {{ formatCurrency(averageLoss) }}
          .metric-item
            span.label Largest Win
            span.value {{ formatCurrency(largestWin) }}
          .metric-item
            span.label Largest Loss
            span.value {{ formatCurrency(largestLoss) }}
    
    .positions-overview
      h3 Current Positions
      .positions-table
        .table-header
          .header-cell Symbol
          .header-cell Size
          .header-cell Entry Price
          .header-cell Current Price
          .header-cell P&L
          .header-cell P&L %
        .table-row(
          v-for="position in positions"
          :key="position.symbol"
        )
          .cell {{ position.symbol }}
          .cell {{ position.size }}
          .cell {{ formatCurrency(position.entryPrice) }}
          .cell {{ formatCurrency(position.currentPrice) }}
          .cell(:class="getPnLClass(position.pnl)") {{ formatCurrency(position.pnl) }}
          .cell(:class="getPnLClass(position.pnlPercent)") {{ formatPercentage(position.pnlPercent) }}
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'PerformanceDashboard',
  data() {
    return {
      selectedPeriod: '30d',
      totalValue: 100000,
      totalReturn: 0.15,
      totalProfit: 15000,
      sharpeRatio: 1.25,
      maxDrawdown: -0.08,
      winRate: 0.65,
      profitFactor: 1.8,
      totalTrades: 45,
      dailyReturn: 0.002,
      monthlyReturn: 0.05,
      annualReturn: 0.18,
      volatility: 0.12,
      var95: -0.025,
      sortinoRatio: 1.45,
      averageWin: 500,
      averageLoss: -300,
      largestWin: 2000,
      largestLoss: -800,
      positions: [
        {
          symbol: 'BTC/USD',
          size: 0.5,
          entryPrice: 45000,
          currentPrice: 48000,
          pnl: 1500,
          pnlPercent: 0.067
        },
        {
          symbol: 'ETH/USD',
          size: 2.0,
          entryPrice: 3200,
          currentPrice: 3100,
          pnl: -200,
          pnlPercent: -0.031
        }
      ]
    }
  },
  mounted() {
    this.initCharts();
  },
  methods: {
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    },
    
    formatPercentage(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    },
    
    getChangeClass(value) {
      return value >= 0 ? 'positive' : 'negative';
    },
    
    getChangeIcon(value) {
      return value >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
    },
    
    getPnLClass(value) {
      return value >= 0 ? 'positive' : 'negative';
    },
    
    initCharts() {
      this.initPortfolioChart();
      this.initRiskChart();
    },
    
    initPortfolioChart() {
      const margin = { top: 20, right: 30, bottom: 30, left: 60 };
      const width = 600 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;
      
      const svg = d3.select('#portfolioChart')
        .append('svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Sample data - replace with real data
      const data = [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-02', value: 102000 },
        { date: '2024-01-03', value: 101500 },
        { date: '2024-01-04', value: 103500 },
        { date: '2024-01-05', value: 105000 }
      ];
      
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)))
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);
      
      const line = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);
      
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#00d4aa')
        .attr('stroke-width', 2)
        .attr('d', line);
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      
      svg.append('g')
        .call(d3.axisLeft(y));
    },
    
    initRiskChart() {
      const margin = { top: 20, right: 30, bottom: 30, left: 60 };
      const width = 600 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;
      
      const svg = d3.select('#riskChart')
        .append('svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Sample risk data
      const data = [
        { risk: 'Market Risk', value: 0.25 },
        { risk: 'Volatility Risk', value: 0.15 },
        { risk: 'Liquidity Risk', value: 0.10 },
        { risk: 'Correlation Risk', value: 0.20 }
      ];
      
      const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.risk))
        .padding(0.2);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);
      
      svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d.risk))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.value))
        .attr('height', d => height - y(d.value))
        .attr('fill', '#ef5350');
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      
      svg.append('g')
        .call(d3.axisLeft(y));
    }
  }
}
</script>

<style scoped>
.performance-dashboard {
  padding: 2rem;
  background: #1e222d;
  color: #d1d4dc;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  color: #00d4aa;
  margin: 0;
}

.time-filter select {
  padding: 0.5rem;
  background: #2a2e39;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #363a45;
}

.metric-card.primary {
  background: linear-gradient(135deg, #00d4aa, #0099cc);
  color: #1e222d;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.9rem;
  color: #787b86;
  margin-bottom: 0.5rem;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.metric-change.positive {
  color: #26a69a;
}

.metric-change.negative {
  color: #ef5350;
}

.metric-subtitle {
  font-size: 0.8rem;
  color: #787b86;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #363a45;
}

.chart-container h3 {
  color: #00d4aa;
  margin-bottom: 1rem;
}

.chart {
  height: 300px;
}

.detailed-metrics {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #363a45;
  margin-bottom: 2rem;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.metric-group h4 {
  color: #00d4aa;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #363a45;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-item .label {
  color: #787b86;
  font-size: 0.9rem;
}

.metric-item .value {
  font-weight: 600;
}

.positions-overview {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #363a45;
}

.positions-overview h3 {
  color: #00d4aa;
  margin-bottom: 1rem;
}

.positions-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 2px solid #363a45;
  font-weight: 600;
  color: #00d4aa;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #363a45;
}

.table-row:last-child {
  border-bottom: none;
}

.cell {
  display: flex;
  align-items: center;
}

.cell.positive {
  color: #26a69a;
}

.cell.negative {
  color: #ef5350;
}

@media (max-width: 768px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
}
</style>
