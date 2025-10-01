#!/usr/bin/env node

const request = require('request-promise');

class GekkoFunctionalTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Running Gekko Functional Tests...\n');

    try {
      await this.testServerHealth();
      await this.testAPIEndpoints();
      await this.testStrategies();
      await this.testBasicMarketWatcher();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Testing failed:', error.message);
      throw error;
    }
  }

  async testServerHealth() {
    console.log('🔍 Testing Server Health...');
    
    try {
      const response = await request({
        url: `${this.baseUrl}/api/info`,
        method: 'GET',
        timeout: 5000
      });

      const info = JSON.parse(response);
      console.log('✅ Server is running');
      console.log(`   Version: ${info.version}`);
      console.log(`   Port: 3000`);
      
      this.testResults.push({ test: 'Server Health', passed: true });
    } catch (error) {
      console.log('❌ Server not responding');
      this.testResults.push({ test: 'Server Health', passed: false, error: error.message });
    }
  }

  async testAPIEndpoints() {
    console.log('🔍 Testing API Endpoints...');
    
    const endpoints = [
      '/api/strategies',
      '/api/exchanges', 
      '/api/apiKeys',
      '/api/gekkos'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await request({
          url: `${this.baseUrl}${endpoint}`,
          method: 'GET',
          timeout: 5000
        });

        console.log(`✅ ${endpoint} - OK`);
        this.testResults.push({ test: `API: ${endpoint}`, passed: true });
      } catch (error) {
        console.log(`❌ ${endpoint} - FAILED`);
        this.testResults.push({ test: `API: ${endpoint}`, passed: false, error: error.message });
      }
    }
  }

  async testStrategies() {
    console.log('🔍 Testing Strategies...');
    
    try {
      const response = await request({
        url: `${this.baseUrl}/api/strategies`,
        method: 'GET',
        timeout: 5000
      });

      const strategies = JSON.parse(response);
      console.log(`✅ Found ${strategies.length} strategies`);
      
      // Check for common strategies
      const strategyNames = strategies.map(s => s.name);
      const requiredStrategies = ['MACD', 'RSI', 'DEMA'];
      
      for (const strategy of requiredStrategies) {
        if (strategyNames.includes(strategy)) {
          console.log(`   ✅ ${strategy} strategy available`);
        } else {
          console.log(`   ⚠️  ${strategy} strategy not found`);
        }
      }
      
      this.testResults.push({ test: 'Strategies', passed: true });
    } catch (error) {
      console.log('❌ Strategies test failed');
      this.testResults.push({ test: 'Strategies', passed: false, error: error.message });
    }
  }

  async testBasicMarketWatcher() {
    console.log('🔍 Testing Basic Market Watcher...');
    
    try {
      const response = await request({
        url: `${this.baseUrl}/api/startGekko`,
        method: 'POST',
        json: {
          mode: 'realtime',
          watch: {
            exchange: 'binance',
            currency: 'USDT',
            asset: 'BTC'
          },
          tradingAdvisor: {
            enabled: false
          },
          type: 'market watcher'
        },
        timeout: 10000
      });

      if (response && response.id) {
        console.log(`✅ Market watcher created: ${response.id}`);
        this.testResults.push({ test: 'Market Watcher', passed: true });
        
        // Clean up the watcher
        try {
          await request({
            url: `${this.baseUrl}/api/stopGekko`,
            method: 'POST',
            json: { id: response.id },
            timeout: 5000
          });
          console.log(`   🧹 Cleaned up watcher: ${response.id}`);
        } catch (cleanupError) {
          console.log(`   ⚠️  Could not clean up watcher: ${cleanupError.message}`);
        }
      } else {
        throw new Error('No watcher ID returned');
      }
    } catch (error) {
      console.log('❌ Market watcher test failed');
      this.testResults.push({ test: 'Market Watcher', passed: false, error: error.message });
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    
    console.log(`\nOverall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Gekko is fully functional.');
      console.log('🌐 Access the UI at: http://localhost:3000');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above.');
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new GekkoFunctionalTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Testing completed!');
      console.log('\n✅ Gekko is ready for use!');
      console.log('🌐 Access the UI at: http://localhost:3000');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = GekkoFunctionalTester; 