#!/usr/bin/env node

/**
 * Security Validation Script
 * Tests the implemented security fixes in Gekko Pro
 */

const security = require('./web/security');
const http = require('http');

console.log('🔒 GEKKO PRO SECURITY VALIDATION\n');

// Test 1: Input Validation
console.log('📝 Testing Input Validation...');
try {
  const validConfig = {
    tradingAdvisor: {
      enabled: true,
      method: 'MACD',
      candleSize: 60,
      historySize: 10
    },
    watch: {
      exchange: 'binance',
      currency: 'USDT',
      asset: 'BTC'
    }
  };

  const { error } = security.configValidationSchema.validate(validConfig);
  if (!error) {
    console.log('✅ Input validation: PASSED');
  } else {
    console.log('❌ Input validation: FAILED -', error.details[0].message);
  }
} catch (err) {
  console.log('❌ Input validation: ERROR -', err.message);
}

// Test 2: Invalid Input Rejection
console.log('\n🚫 Testing Invalid Input Rejection...');
try {
  const invalidConfig = {
    tradingAdvisor: {
      enabled: true,
      method: 'MACD',
      candleSize: 'invalid',
      historySize: -1
    },
    watch: {
      exchange: 'binance',
      currency: 'USDT',
      asset: 'BTC'
    }
  };

  const { error } = security.configValidationSchema.validate(invalidConfig);
  if (error) {
    console.log('✅ Invalid input rejection: PASSED');
  } else {
    console.log('❌ Invalid input rejection: FAILED');
  }
} catch (err) {
  console.log('❌ Invalid input rejection: ERROR -', err.message);
}

// Test 3: Rate Limiting
console.log('\n⏱️  Testing Rate Limiting...');
try {
  const rateLimiter = security.createRateLimiter(1000, 3);
  const ctx = { ip: '127.0.0.1' };

  let passedTests = 0;
  let blockedRequests = 0;

  // Test first 3 requests (should pass)
  for (let i = 0; i < 3; i++) {
    rateLimiter(ctx, () => {}).then(() => {
      passedTests++;
    }).catch(() => {
      // Should not happen for first 3
    });
  }

  // Test 4th request (should be blocked)
  setTimeout(() => {
    const blockedCtx = {
      ip: '127.0.0.1',
      status: 0,
      body: {}
    };

    rateLimiter(blockedCtx, () => {}).then(() => {
      // Should not reach here
    }).catch(() => {
      if (blockedCtx.status === 429) {
        blockedRequests++;
      }
    });

    setTimeout(() => {
      if (passedTests >= 3 && blockedRequests > 0) {
        console.log('✅ Rate limiting: PASSED');
      } else {
        console.log('❌ Rate limiting: FAILED');
      }
    }, 100);
  }, 100);

} catch (err) {
  console.log('❌ Rate limiting: ERROR -', err.message);
}

// Test 4: CORS Configuration
console.log('\n🌐 Testing CORS Configuration...');
try {
  // Test allowed origins
  const allowedCtx = { headers: { origin: 'http://localhost:3000' } };
  const allowedOrigin = security.corsOptions.origin(allowedCtx);

  // Test blocked origins
  const blockedCtx = { headers: { origin: 'https://evil.com' } };
  const blockedOrigin = security.corsOptions.origin(blockedCtx);

  if (allowedOrigin === 'http://localhost:3000' && blockedOrigin === false) {
    console.log('✅ CORS configuration: PASSED');
  } else {
    console.log('❌ CORS configuration: FAILED');
  }
} catch (err) {
  console.log('❌ CORS configuration: ERROR -', err.message);
}

// Test 5: Security Headers
console.log('\n🛡️  Testing Security Headers...');
try {
  const ctx = {
    set: function(key, value) {
      this.headers = this.headers || {};
      this.headers[key] = value;
    }
  };

  security.contentSecurityPolicy(ctx, () => {});

  const hasCSP = ctx.headers['Content-Security-Policy'] &&
                  ctx.headers['Content-Security-Policy'].includes("default-src 'self'");
  const hasXFrame = ctx.headers['X-Frame-Options'] === 'DENY';
  const hasXSS = ctx.headers['X-XSS-Protection'] === '1; mode=block';

  if (hasCSP && hasXFrame && hasXSS) {
    console.log('✅ Security headers: PASSED');
  } else {
    console.log('❌ Security headers: FAILED');
  }
} catch (err) {
  console.log('❌ Security headers: ERROR -', err.message);
}

// Test 6: API Key Validation
console.log('\n🔑 Testing API Key Validation...');
try {
  const originalEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.API_KEY;

  // Test development mode (should bypass)
  process.env.NODE_ENV = 'development';
  const devCtx = { headers: {} };
  let devNextCalled = false;
  security.validateApiKey(devCtx, () => { devNextCalled = true; });

  // Test production mode with valid key
  process.env.NODE_ENV = 'production';
  process.env.API_KEY = 'test-key-123';
  const prodCtx = { headers: { 'x-api-key': 'test-key-123' } };
  let prodNextCalled = false;
  security.validateApiKey(prodCtx, () => { prodNextCalled = true; });

  // Test production mode with invalid key
  const invalidCtx = { headers: { 'x-api-key': 'wrong-key' }, status: 0 };
  let invalidNextCalled = false;
  security.validateApiKey(invalidCtx, () => { invalidNextCalled = true; });

  // Restore environment
  process.env.NODE_ENV = originalEnv;
  process.env.API_KEY = originalApiKey;

  if (devNextCalled && prodNextCalled && !invalidNextCalled && invalidCtx.status === 401) {
    console.log('✅ API key validation: PASSED');
  } else {
    console.log('❌ API key validation: FAILED');
  }
} catch (err) {
  console.log('❌ API key validation: ERROR -', err.message);
}

// Test 7: Error Handling
console.log('\n🚨 Testing Error Handling...');
try {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const ctx = { status: 0, body: {} };
  const error = new Error('Sensitive database error: password=secret');

  security.errorHandler(ctx, () => { throw error; });

  process.env.NODE_ENV = originalEnv;

  if (ctx.status === 500 && ctx.body.error === 'Internal server error' && !ctx.body.stack) {
    console.log('✅ Error handling: PASSED');
  } else {
    console.log('❌ Error handling: FAILED');
  }
} catch (err) {
  console.log('❌ Error handling: ERROR -', err.message);
}

console.log('\n📊 SECURITY VALIDATION COMPLETE');
console.log('=====================================');
console.log('Next steps:');
console.log('1. Fix remaining 8 vulnerabilities (require breaking changes)');
console.log('2. Complete Vue 3 migration');
console.log('3. Implement bundle optimization');
console.log('4. Run functional testing per PRD');
