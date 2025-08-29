<template lang='pug'>
  .strategy-marketplace
    .marketplace-header
      h2 Strategy Marketplace
      p Discover, share, and profit from community strategies
    
    .marketplace-filters
      .search-section
        input.search-input(
          v-model="searchQuery"
          placeholder="Search strategies..."
          @input="filterStrategies"
        )
        button.search-btn(@click="filterStrategies")
          i.fas.fa-search
    
      .filter-section
        .filter-group
          label Category
          select(v-model="selectedCategory" @change="filterStrategies")
            option(value="") All Categories
            option(value="trend-following") Trend Following
            option(value="mean-reversion") Mean Reversion
            option(value="momentum") Momentum
            option(value="arbitrage") Arbitrage
            option(value="grid") Grid Trading
        
        .filter-group
          label Min Rating
          select(v-model="minRating" @change="filterStrategies")
            option(value="0") Any Rating
            option(value="3") 3+ Stars
            option(value="4") 4+ Stars
            option(value="4.5") 4.5+ Stars
        
        .filter-group
          label Min Performance
          select(v-model="minPerformance" @change="filterStrategies")
            option(value="0") Any Performance
            option(value="0.1") 10%+ Return
            option(value="0.2") 20%+ Return
            option(value="0.5") 50%+ Return
    
    .marketplace-content
      .strategies-grid
        .strategy-card(
          v-for="strategy in filteredStrategies"
          :key="strategy.id"
          @click="viewStrategy(strategy)"
        )
          .strategy-header
            .strategy-title {{ strategy.name }}
            .strategy-author by {{ strategy.author }}
          
          .strategy-description {{ strategy.description }}
          
          .strategy-stats
            .stat-item
              i.fas.fa-star
              span {{ strategy.rating.toFixed(1) }}
            .stat-item
              i.fas.fa-download
              span {{ strategy.downloads }}
            .stat-item
              i.fas.fa-chart-line
              span {{ (strategy.performance.totalReturn * 100).toFixed(1) }}%
          
          .strategy-tags
            .tag(
              v-for="tag in strategy.tags"
              :key="tag"
            ) {{ tag }}
          
          .strategy-actions
            button.btn-primary(@click.stop="downloadStrategy(strategy)")
              i.fas.fa-download
              span Download
            button.btn-secondary(@click.stop="previewStrategy(strategy)")
              i.fas.fa-eye
              span Preview
    
    .strategy-modal(v-if="selectedStrategy")
      .modal-overlay(@click="closeModal")
      .modal-content
        .modal-header
          h3 {{ selectedStrategy.name }}
          button.close-btn(@click="closeModal")
            i.fas.fa-times
        
        .modal-body
          .strategy-details
            .detail-row
              .label Author
              .value {{ selectedStrategy.author }}
            .detail-row
              .label Category
              .value {{ selectedStrategy.category }}
            .detail-row
              .label Rating
              .value
                i.fas.fa-star(v-for="i in 5" :key="i" :class="{ filled: i <= selectedStrategy.rating }")
                span ({{ selectedStrategy.rating.toFixed(1) }})
            .detail-row
              .label Downloads
              .value {{ selectedStrategy.downloads }}
            .detail-row
              .label Created
              .value {{ formatDate(selectedStrategy.createdAt) }}
          
          .strategy-description
            h4 Description
            p {{ selectedStrategy.description }}
          
          .strategy-performance
            h4 Performance Metrics
            .performance-grid
              .metric
                .metric-label Total Return
                .metric-value {{ (selectedStrategy.performance.totalReturn * 100).toFixed(1) }}%
              .metric
                .metric-label Sharpe Ratio
                .metric-value {{ selectedStrategy.performance.sharpeRatio.toFixed(2) }}
              .metric
                .metric-label Max Drawdown
                .metric-value {{ (selectedStrategy.performance.maxDrawdown * 100).toFixed(1) }}%
              .metric
                .metric-label Win Rate
                .metric-value {{ (selectedStrategy.performance.winRate * 100).toFixed(1) }}%
          
          .strategy-reviews(v-if="selectedStrategy.reviews.length > 0")
            h4 Reviews
            .review-item(
              v-for="review in selectedStrategy.reviews"
              :key="review.id"
            )
              .review-header
                .reviewer {{ review.user }}
                .review-rating
                  i.fas.fa-star(v-for="i in 5" :key="i" :class="{ filled: i <= review.rating }")
                .review-date {{ formatDate(review.timestamp) }}
              .review-text {{ review.review }}
        
        .modal-footer
          button.btn-primary(@click="downloadStrategy(selectedStrategy)")
            i.fas.fa-download
            span Download Strategy
          button.btn-secondary(@click="testStrategy(selectedStrategy)")
            i.fas.fa-play
            span Test Strategy
          button.btn-success(@click="deployStrategy(selectedStrategy)")
            i.fas.fa-rocket
            span Deploy Strategy
    
    .upload-section
      h3 Share Your Strategy
      button.btn-primary(@click="showUploadModal = true")
        i.fas.fa-upload
        span Upload Strategy
    
    .upload-modal(v-if="showUploadModal")
      .modal-overlay(@click="showUploadModal = false")
      .modal-content
        .modal-header
          h3 Upload Strategy
          button.close-btn(@click="showUploadModal = false")
            i.fas.fa-times
        
        .modal-body
          form.strategy-form(@submit.prevent="uploadStrategy")
            .form-group
              label Strategy Name
              input(
                v-model="newStrategy.name"
                type="text"
                required
                placeholder="Enter strategy name"
              )
            
            .form-group
              label Description
              textarea(
                v-model="newStrategy.description"
                required
                placeholder="Describe your strategy"
                rows="4"
              )
            
            .form-group
              label Category
              select(v-model="newStrategy.category" required)
                option(value="trend-following") Trend Following
                option(value="mean-reversion") Mean Reversion
                option(value="momentum") Momentum
                option(value="arbitrage") Arbitrage
                option(value="grid") Grid Trading
            
            .form-group
              label Tags
              input(
                v-model="newStrategy.tagsInput"
                type="text"
                placeholder="Enter tags separated by commas"
              )
            
            .form-group
              label Strategy Code
              textarea(
                v-model="newStrategy.code"
                required
                placeholder="Paste your strategy code here"
                rows="10"
              )
            
            .form-group
              label Performance Data (JSON)
              textarea(
                v-model="newStrategy.performanceData"
                placeholder="Paste performance data in JSON format"
                rows="6"
              )
            
            .form-actions
              button.btn-primary(type="submit")
                i.fas.fa-upload
                span Upload Strategy
              button.btn-secondary(type="button" @click="showUploadModal = false")
                Cancel
</template>

<script>
export default {
  name: 'StrategyMarketplace',
  data() {
    return {
      searchQuery: '',
      selectedCategory: '',
      minRating: 0,
      minPerformance: 0,
      strategies: [],
      filteredStrategies: [],
      selectedStrategy: null,
      showUploadModal: false,
      newStrategy: {
        name: '',
        description: '',
        category: '',
        tagsInput: '',
        code: '',
        performanceData: ''
      }
    }
  },
  mounted() {
    this.loadStrategies();
  },
  methods: {
    async loadStrategies() {
      try {
        // Simulate API call
        this.strategies = [
          {
            id: 1,
            name: 'Golden Cross Momentum',
            author: 'CryptoTrader_Pro',
            description: 'A momentum strategy based on golden cross signals with RSI confirmation',
            category: 'momentum',
            tags: ['momentum', 'RSI', 'golden-cross'],
            rating: 4.5,
            downloads: 1250,
            createdAt: new Date('2024-01-15'),
            performance: {
              totalReturn: 0.45,
              sharpeRatio: 1.8,
              maxDrawdown: -0.12,
              winRate: 0.68
            },
            reviews: [
              {
                id: 1,
                user: 'Trader123',
                rating: 5,
                review: 'Excellent strategy! Made 45% returns in 3 months.',
                timestamp: new Date('2024-01-20')
              }
            ]
          },
          {
            id: 2,
            name: 'Mean Reversion Grid',
            author: 'GridMaster',
            description: 'Grid trading strategy for sideways markets with mean reversion signals',
            category: 'grid',
            tags: ['grid', 'mean-reversion', 'sideways'],
            rating: 4.2,
            downloads: 890,
            createdAt: new Date('2024-01-10'),
            performance: {
              totalReturn: 0.28,
              sharpeRatio: 1.4,
              maxDrawdown: -0.08,
              winRate: 0.72
            },
            reviews: []
          }
        ];
        
        this.filteredStrategies = [...this.strategies];
      } catch (error) {
        console.error('Failed to load strategies:', error);
      }
    },
    
    filterStrategies() {
      let filtered = [...this.strategies];
      
      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(strategy => 
          strategy.name.toLowerCase().includes(query) ||
          strategy.description.toLowerCase().includes(query) ||
          strategy.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Category filter
      if (this.selectedCategory) {
        filtered = filtered.filter(strategy => 
          strategy.category === this.selectedCategory
        );
      }
      
      // Rating filter
      if (this.minRating > 0) {
        filtered = filtered.filter(strategy => 
          strategy.rating >= parseFloat(this.minRating)
        );
      }
      
      // Performance filter
      if (this.minPerformance > 0) {
        filtered = filtered.filter(strategy => 
          strategy.performance.totalReturn >= parseFloat(this.minPerformance)
        );
      }
      
      this.filteredStrategies = filtered;
    },
    
    viewStrategy(strategy) {
      this.selectedStrategy = strategy;
    },
    
    closeModal() {
      this.selectedStrategy = null;
    },
    
    async downloadStrategy(strategy) {
      try {
        // Simulate download
        console.log('Downloading strategy:', strategy.name);
        
        // Create downloadable file
        const strategyData = {
          name: strategy.name,
          description: strategy.description,
          category: strategy.category,
          tags: strategy.tags,
          code: strategy.code || '// Strategy code would be here',
          performance: strategy.performance
        };
        
        const dataStr = JSON.stringify(strategyData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${strategy.name.replace(/\s+/g, '_')}.json`;
        link.click();
        
        // Update download count
        strategy.downloads++;
        
        this.$emit('strategy-downloaded', strategy);
      } catch (error) {
        console.error('Failed to download strategy:', error);
      }
    },
    
    previewStrategy(strategy) {
      this.viewStrategy(strategy);
    },
    
    async testStrategy(strategy) {
      try {
        console.log('Testing strategy:', strategy.name);
        this.$emit('test-strategy', strategy);
        this.closeModal();
      } catch (error) {
        console.error('Failed to test strategy:', error);
      }
    },
    
    async deployStrategy(strategy) {
      try {
        console.log('Deploying strategy:', strategy.name);
        this.$emit('deploy-strategy', strategy);
        this.closeModal();
      } catch (error) {
        console.error('Failed to deploy strategy:', error);
      }
    },
    
    async uploadStrategy() {
      try {
        const strategyData = {
          ...this.newStrategy,
          tags: this.newStrategy.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag),
          performance: this.newStrategy.performanceData ? JSON.parse(this.newStrategy.performanceData) : {},
          rating: 0,
          downloads: 0,
          reviews: [],
          createdAt: new Date()
        };
        
        // Simulate API call
        console.log('Uploading strategy:', strategyData);
        
        // Add to local list
        this.strategies.unshift({
          id: Date.now(),
          ...strategyData
        });
        
        this.filterStrategies();
        this.showUploadModal = false;
        this.resetForm();
        
        this.$emit('strategy-uploaded', strategyData);
      } catch (error) {
        console.error('Failed to upload strategy:', error);
      }
    },
    
    resetForm() {
      this.newStrategy = {
        name: '',
        description: '',
        category: '',
        tagsInput: '',
        code: '',
        performanceData: ''
      };
    },
    
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    }
  }
}
</script>

<style scoped>
.strategy-marketplace {
  padding: 2rem;
  background: #1e222d;
  color: #d1d4dc;
  min-height: 100vh;
}

.marketplace-header {
  text-align: center;
  margin-bottom: 2rem;
}

.marketplace-header h2 {
  color: #00d4aa;
  margin-bottom: 0.5rem;
}

.marketplace-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-section {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  min-width: 300px;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  background: #2a2e39;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
}

.search-btn {
  padding: 0.75rem 1rem;
  background: #00d4aa;
  border: none;
  border-radius: 4px;
  color: #1e222d;
  cursor: pointer;
}

.filter-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.9rem;
  color: #787b86;
}

.filter-group select {
  padding: 0.5rem;
  background: #2a2e39;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
  min-width: 120px;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.strategy-card {
  background: #2a2e39;
  border: 1px solid #363a45;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.strategy-card:hover {
  border-color: #00d4aa;
  transform: translateY(-2px);
}

.strategy-header {
  margin-bottom: 1rem;
}

.strategy-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #00d4aa;
  margin-bottom: 0.25rem;
}

.strategy-author {
  font-size: 0.9rem;
  color: #787b86;
}

.strategy-description {
  color: #d1d4dc;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.strategy-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #787b86;
}

.stat-item i {
  color: #00d4aa;
}

.strategy-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tag {
  background: #363a45;
  color: #d1d4dc;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.strategy-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary,
.btn-success {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #00d4aa;
  color: #1e222d;
}

.btn-secondary {
  background: #787b86;
  color: #1e222d;
}

.btn-success {
  background: #26a69a;
  color: #1e222d;
}

.strategy-modal,
.upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
}

.modal-content {
  background: #2a2e39;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #363a45;
}

.modal-header h3 {
  color: #00d4aa;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #787b86;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.strategy-details {
  margin-bottom: 2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #363a45;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: #787b86;
  font-weight: 500;
}

.detail-row .value {
  color: #d1d4dc;
}

.detail-row .value i {
  color: #00d4aa;
  margin-right: 0.25rem;
}

.detail-row .value i.filled {
  color: #ffd700;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric {
  background: #363a45;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
}

.metric-label {
  color: #787b86;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.metric-value {
  color: #00d4aa;
  font-size: 1.2rem;
  font-weight: 600;
}

.review-item {
  background: #363a45;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.reviewer {
  font-weight: 600;
  color: #d1d4dc;
}

.review-rating i {
  color: #ffd700;
  margin-right: 0.25rem;
}

.review-date {
  color: #787b86;
  font-size: 0.9rem;
}

.review-text {
  color: #d1d4dc;
  line-height: 1.5;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #363a45;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.upload-section {
  text-align: center;
  margin-top: 2rem;
}

.strategy-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: #787b86;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  background: #1e222d;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
  font-family: 'Courier New', monospace;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .marketplace-filters {
    flex-direction: column;
  }
  
  .search-section {
    min-width: auto;
  }
  
  .strategies-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
}
</style>
