<template lang='pug'>
  .mobile-dashboard
    .mobile-header
      .header-content
        .logo-section
          i.fas.fa-chart-line
          span Gekko Pro
        .notifications
          i.fas.fa-bell(@click="toggleNotifications")
          .notification-badge(v-if="unreadNotifications") {{ unreadNotifications }}
    
    .quick-stats
      .stat-card.primary
        .stat-value {{ formatCurrency(portfolioValue) }}
        .stat-label Portfolio Value
        .stat-change(:class="getChangeClass(dailyChange)")
          i(:class="getChangeIcon(dailyChange)")
          span {{ formatPercentage(dailyChange) }}
      
      .stats-grid
        .stat-item
          .stat-value {{ formatPercentage(totalReturn) }}
          .stat-label Total Return
        .stat-item
          .stat-value {{ (winRate * 100).toFixed(1) }}%
          .stat-label Win Rate
        .stat-item
          .stat-value {{ totalTrades }}
          .stat-label Trades
    
    .quick-actions
      .action-grid
        .action-item(@click="startTrading")
          i.fas.fa-play
          span Start Trading
        .action-item(@click="openBacktest")
          i.fas.fa-chart-bar
          span Backtest
        .action-item(@click="viewStrategies")
          i.fas.fa-cogs
          span Strategies
        .action-item(@click="viewPortfolio")
          i.fas.fa-wallet
          span Portfolio
    
    .active-positions
      h3 Active Positions
      .position-list
        .position-item(
          v-for="position in activePositions"
          :key="position.symbol"
          @click="viewPosition(position)"
        )
          .position-header
            .symbol {{ position.symbol }}
            .pnl(:class="getPnLClass(position.pnl)") {{ formatCurrency(position.pnl) }}
          .position-details
            .detail
              span.label Size:
              span.value {{ position.size }}
            .detail
              span.label Entry:
              span.value {{ formatCurrency(position.entryPrice) }}
            .detail
              span.label Current:
              span.value {{ formatCurrency(position.currentPrice) }}
    
    .recent-trades
      h3 Recent Trades
      .trade-list
        .trade-item(
          v-for="trade in recentTrades"
          :key="trade.id"
        )
          .trade-header
            .trade-info
              .symbol {{ trade.symbol }}
              .action(:class="trade.action.toLowerCase()") {{ trade.action }}
            .trade-amount(:class="getPnLClass(trade.profit)") {{ formatCurrency(trade.profit) }}
          .trade-details
            .time {{ formatTime(trade.timestamp) }}
            .price {{ formatCurrency(trade.price) }}
    
    .bottom-nav
      .nav-item(:class="{ active: activeTab === 'dashboard' }" @click="setActiveTab('dashboard')")
        i.fas.fa-home
        span Dashboard
      .nav-item(:class="{ active: activeTab === 'trading' }" @click="setActiveTab('trading')")
        i.fas.fa-chart-line
        span Trading
      .nav-item(:class="{ active: activeTab === 'portfolio' }" @click="setActiveTab('portfolio')")
        i.fas.fa-wallet
        span Portfolio
      .nav-item(:class="{ active: activeTab === 'settings' }" @click="setActiveTab('settings')")
        i.fas.fa-cog
        span Settings
    
    // Notifications Panel
    .notifications-panel(v-if="showNotifications")
      .notifications-header
        h3 Notifications
        i.fas.fa-times(@click="toggleNotifications")
      .notifications-list
        .notification-item(
          v-for="notification in notifications"
          :key="notification.id"
          :class="{ unread: !notification.read }"
          @click="markAsRead(notification.id)"
        )
          .notification-icon
            i(:class="getNotificationIcon(notification.type)")
          .notification-content
            .notification-title {{ notification.title }}
            .notification-message {{ notification.message }}
            .notification-time {{ formatTime(notification.timestamp) }}
</template>

<script>
export default {
  name: 'MobileDashboard',
  data() {
    return {
      activeTab: 'dashboard',
      showNotifications: false,
      unreadNotifications: 3,
      portfolioValue: 100000,
      dailyChange: 0.025,
      totalReturn: 0.15,
      winRate: 0.65,
      totalTrades: 45,
      activePositions: [
        {
          symbol: 'BTC/USD',
          size: 0.5,
          entryPrice: 45000,
          currentPrice: 48000,
          pnl: 1500
        },
        {
          symbol: 'ETH/USD',
          size: 2.0,
          entryPrice: 3200,
          currentPrice: 3100,
          pnl: -200
        }
      ],
      recentTrades: [
        {
          id: 1,
          symbol: 'BTC/USD',
          action: 'BUY',
          price: 48000,
          profit: 500,
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: 2,
          symbol: 'ETH/USD',
          action: 'SELL',
          price: 3100,
          profit: -100,
          timestamp: new Date(Date.now() - 7200000)
        }
      ],
      notifications: [
        {
          id: 1,
          type: 'trade',
          title: 'Trade Executed',
          message: 'BTC/USD BUY order filled at $48,000',
          timestamp: new Date(Date.now() - 300000),
          read: false
        },
        {
          id: 2,
          type: 'alert',
          title: 'Price Alert',
          message: 'ETH/USD has reached your target price',
          timestamp: new Date(Date.now() - 600000),
          read: false
        },
        {
          id: 3,
          type: 'performance',
          title: 'Daily Summary',
          message: 'Portfolio up 2.5% today',
          timestamp: new Date(Date.now() - 86400000),
          read: true
        }
      ]
    }
  },
  mounted() {
    this.initializePushNotifications();
    this.startRealTimeUpdates();
  },
  methods: {
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    },
    
    formatPercentage(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    },
    
    formatTime(timestamp) {
      const now = new Date();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 60) {
        return `${minutes}m ago`;
      } else if (hours < 24) {
        return `${hours}h ago`;
      } else {
        return `${days}d ago`;
      }
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
    
    getNotificationIcon(type) {
      const icons = {
        trade: 'fas fa-exchange-alt',
        alert: 'fas fa-exclamation-triangle',
        performance: 'fas fa-chart-line',
        error: 'fas fa-exclamation-circle'
      };
      return icons[type] || 'fas fa-bell';
    },
    
    setActiveTab(tab) {
      this.activeTab = tab;
      this.$emit('tab-change', tab);
    },
    
    toggleNotifications() {
      this.showNotifications = !this.showNotifications;
    },
    
    markAsRead(notificationId) {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
      }
    },
    
    startTrading() {
      this.$emit('start-trading');
    },
    
    openBacktest() {
      this.$emit('open-backtest');
    },
    
    viewStrategies() {
      this.$emit('view-strategies');
    },
    
    viewPortfolio() {
      this.$emit('view-portfolio');
    },
    
    viewPosition(position) {
      this.$emit('view-position', position);
    },
    
    initializePushNotifications() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered');
            return registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
            });
          })
          .then(subscription => {
            console.log('Push notification subscription:', subscription);
            // Send subscription to server
          })
          .catch(error => {
            console.error('Push notification setup failed:', error);
          });
      }
    },
    
    startRealTimeUpdates() {
      // WebSocket connection for real-time updates
      const ws = new WebSocket('ws://localhost:3000');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleRealTimeUpdate(data);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    
    handleRealTimeUpdate(data) {
      switch (data.type) {
        case 'portfolio_update':
          this.portfolioValue = data.value;
          this.dailyChange = data.dailyChange;
          break;
        case 'trade_executed':
          this.recentTrades.unshift(data.trade);
          this.recentTrades = this.recentTrades.slice(0, 10);
          this.showTradeNotification(data.trade);
          break;
        case 'position_update':
          this.updatePosition(data.position);
          break;
      }
    },
    
    showTradeNotification(trade) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Trade Executed', {
          body: `${trade.symbol} ${trade.action} at ${this.formatCurrency(trade.price)}`,
          icon: '/icon.png'
        });
      }
    },
    
    updatePosition(position) {
      const index = this.activePositions.findIndex(p => p.symbol === position.symbol);
      if (index !== -1) {
        this.activePositions[index] = position;
      }
    },
    
    urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
  }
}
</script>

<style scoped>
.mobile-dashboard {
  background: #1e222d;
  color: #d1d4dc;
  min-height: 100vh;
  padding-bottom: 80px;
}

.mobile-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
}

.logo-section i {
  color: #00d4aa;
  font-size: 1.5rem;
}

.notifications {
  position: relative;
}

.notifications i {
  font-size: 1.2rem;
  color: #d1d4dc;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef5350;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-stats {
  padding: 1rem;
}

.stat-card.primary {
  background: linear-gradient(135deg, #00d4aa, #0099cc);
  color: #1e222d;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.stat-change.positive {
  color: #26a69a;
}

.stat-change.negative {
  color: #ef5350;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-item .stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-item .stat-label {
  font-size: 0.8rem;
  color: #787b86;
}

.quick-actions {
  padding: 1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.action-item {
  background: #2a2e39;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #363a45;
}

.action-item:hover {
  background: #363a45;
  transform: translateY(-2px);
}

.action-item i {
  font-size: 2rem;
  color: #00d4aa;
  margin-bottom: 0.5rem;
  display: block;
}

.action-item span {
  font-weight: 600;
}

.active-positions,
.recent-trades {
  padding: 1rem;
}

.active-positions h3,
.recent-trades h3 {
  color: #00d4aa;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.position-item,
.trade-item {
  background: #2a2e39;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid #363a45;
}

.position-header,
.trade-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.symbol {
  font-weight: 600;
  font-size: 1rem;
}

.pnl,
.trade-amount {
  font-weight: 700;
  font-size: 1rem;
}

.pnl.positive,
.trade-amount.positive {
  color: #26a69a;
}

.pnl.negative,
.trade-amount.negative {
  color: #ef5350;
}

.position-details,
.trade-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  font-size: 0.8rem;
}

.detail {
  display: flex;
  flex-direction: column;
}

.label {
  color: #787b86;
  margin-bottom: 0.25rem;
}

.value {
  font-weight: 600;
}

.action {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.action.buy {
  background: #26a69a;
  color: white;
}

.action.sell {
  background: #ef5350;
  color: white;
}

.time {
  color: #787b86;
  font-size: 0.8rem;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #2a2e39;
  border-top: 1px solid #363a45;
  display: flex;
  padding: 0.5rem 0;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item.active {
  color: #00d4aa;
}

.nav-item i {
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.nav-item span {
  font-size: 0.8rem;
}

.notifications-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1e222d;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #363a45;
}

.notifications-header h3 {
  color: #00d4aa;
  margin: 0;
}

.notifications-header i {
  font-size: 1.2rem;
  cursor: pointer;
}

.notification-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #2a2e39;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border-left: 4px solid transparent;
}

.notification-item.unread {
  border-left-color: #00d4aa;
  background: #363a45;
}

.notification-icon i {
  font-size: 1.2rem;
  color: #00d4aa;
  margin-top: 0.25rem;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.notification-message {
  color: #787b86;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.notification-time {
  color: #787b86;
  font-size: 0.8rem;
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .position-details,
  .trade-details {
    grid-template-columns: 1fr;
  }
}
</style>
