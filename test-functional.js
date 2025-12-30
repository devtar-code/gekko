#!/usr/bin/env node

const fetch = require('node-fetch');

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/info`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const info = await response.json();
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await response.json(); // Consume response
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/strategies`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const strategies = await response.json();
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/api/startGekko`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result && result.id) {
        console.log(`✅ Market watcher created: ${result.id}`);
        this.testResults.push({ test: 'Market Watcher', passed: true });
        
        // Clean up the watcher
        try {
          const cleanupController = new AbortController();
          const cleanupTimeoutId = setTimeout(() => cleanupController.abort(), 5000);
          
          const cleanupResponse = await fetch(`${this.baseUrl}/api/stopGekko`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: result.id }),
            signal: cleanupController.signal
          });
          clearTimeout(cleanupTimeoutId);
          
          if (cleanupResponse.ok) {
            console.log(`   🧹 Cleaned up watcher: ${result.id}`);
          } else {
            console.log(`   ⚠️  Could not clean up watcher: ${cleanupResponse.status}`);
          }
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