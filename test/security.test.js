const chai = require('chai');
const expect = chai.expect;
const supertest = require('supertest');
const security = require('../web/security');

describe('🔒 Security Testing Suite', function() {
  this.timeout(10000);

  describe('Input Validation', () => {
    it('should validate tradingAdvisor configuration correctly', () => {
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
      expect(error).to.be.undefined;
    });

    it('should reject invalid candleSize', () => {
      const invalidConfig = {
        tradingAdvisor: {
          enabled: true,
          method: 'MACD',
          candleSize: 'invalid',
          historySize: 10
        },
        watch: {
          exchange: 'binance',
          currency: 'USDT',
          asset: 'BTC'
        }
      };

      const { error } = security.configValidationSchema.validate(invalidConfig);
      expect(error).to.not.be.undefined;
    });

    it('should reject negative historySize', () => {
      const invalidConfig = {
        tradingAdvisor: {
          enabled: true,
          method: 'MACD',
          candleSize: 60,
          historySize: -1
        },
        watch: {
          exchange: 'binance',
          currency: 'USDT',
          asset: 'BTC'
        }
      };

      const { error } = security.configValidationSchema.validate(invalidConfig);
      expect(error).to.not.be.undefined;
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const rateLimiter = security.createRateLimiter(1000, 5);
      const ctx = { ip: '127.0.0.1' };

      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        let allowed = true;
        rateLimiter(ctx, () => {}).catch(() => allowed = false);
        expect(allowed).to.be.true;
      }
    });

    it('should block requests over limit', (done) => {
      const rateLimiter = security.createRateLimiter(1000, 2);
      const ctx = { ip: '127.0.0.1', status: 429, body: {} };

      // First two requests should work
      rateLimiter(ctx, () => {}).then(() => {
        return rateLimiter(ctx, () => {});
      }).then(() => {
        // Third request should be blocked
        rateLimiter(ctx, () => {}).then(() => {
          expect(ctx.status).to.equal(429);
          expect(ctx.body.error).to.equal('Too many requests');
          done();
        });
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should allow localhost origins', () => {
      const ctx = {
        headers: { origin: 'http://localhost:3000' }
      };

      const origin = security.corsOptions.origin(ctx);
      expect(origin).to.equal('http://localhost:3000');
    });

    it('should allow https localhost origins', () => {
      const ctx = {
        headers: { origin: 'https://localhost:3000' }
      };

      const origin = security.corsOptions.origin(ctx);
      expect(origin).to.equal('https://localhost:3000');
    });

    it('should reject unauthorized origins', () => {
      const ctx = {
        headers: { origin: 'https://evil.com' }
      };

      const origin = security.corsOptions.origin(ctx);
      expect(origin).to.be.false;
    });

    it('should handle missing origin', () => {
      const ctx = {
        headers: {}
      };

      const origin = security.corsOptions.origin(ctx);
      expect(origin).to.be.false;
    });
  });

  describe('Security Headers', () => {
    it('should set CSP headers', (done) => {
      const ctx = {
        set: function(key, value) {
          this.headers = this.headers || {};
          this.headers[key] = value;
        }
      };

      security.contentSecurityPolicy(ctx, () => {
        expect(ctx.headers['Content-Security-Policy']).to.include("default-src 'self'");
        expect(ctx.headers['Content-Security-Policy']).to.include("script-src 'self'");
        expect(ctx.headers['X-Content-Type-Options']).to.equal('nosniff');
        expect(ctx.headers['X-Frame-Options']).to.equal('DENY');
        expect(ctx.headers['X-XSS-Protection']).to.equal('1; mode=block');
        done();
      });
    });

    it('should set HSTS in production', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const ctx = {
        set: function(key, value) {
          this.headers = this.headers || {};
          this.headers[key] = value;
        }
      };

      security.contentSecurityPolicy(ctx, () => {
        expect(ctx.headers['Strict-Transport-Security']).to.include('max-age=31536000');
        process.env.NODE_ENV = originalEnv;
        done();
      });
    });
  });

  describe('API Key Validation', () => {
    it('should accept valid API key in production', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalApiKey = process.env.API_KEY;
      process.env.NODE_ENV = 'production';
      process.env.API_KEY = 'test-key-123';

      const ctx = {
        headers: { 'x-api-key': 'test-key-123' }
      };

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      security.validateApiKey(ctx, next);
      expect(nextCalled).to.be.true;

      process.env.NODE_ENV = originalEnv;
      process.env.API_KEY = originalApiKey;
    });

    it('should reject invalid API key in production', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalApiKey = process.env.API_KEY;
      process.env.NODE_ENV = 'production';
      process.env.API_KEY = 'test-key-123';

      const ctx = {
        headers: { 'x-api-key': 'wrong-key' },
        status: 0,
        body: {}
      };

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      security.validateApiKey(ctx, next);
      expect(nextCalled).to.be.false;
      expect(ctx.status).to.equal(401);

      process.env.NODE_ENV = originalEnv;
      process.env.API_KEY = originalApiKey;
    });

    it('should bypass validation in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const ctx = {
        headers: {}
      };

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      security.validateApiKey(ctx, next);
      expect(nextCalled).to.be.true;

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should sanitize error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const ctx = {
        status: 0,
        body: {}
      };

      const error = new Error('Sensitive database error: password=secret');
      security.errorHandler(ctx, () => {
        throw error;
      });

      expect(ctx.status).to.equal(500);
      expect(ctx.body.error).to.equal('Internal server error');
      expect(ctx.body.stack).to.be.undefined;

      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const ctx = {
        status: 0,
        body: {}
      };

      const error = new Error('Test error');
      security.errorHandler(ctx, () => {
        throw error;
      });

      expect(ctx.status).to.equal(500);
      expect(ctx.body.error).to.equal('Test error');
      expect(ctx.body.stack).to.include('Test error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Request Logging', () => {
    let originalConsoleLog;
    let loggedMessages = [];

    beforeEach(() => {
      originalConsoleLog = console.log;
      loggedMessages = [];
      console.log = (...args) => {
        loggedMessages.push(args.join(' '));
      };
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should log requests', (done) => {
      const ctx = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0 Test Browser'
      };

      const start = Date.now();
      security.requestLogger(ctx, () => {
        const end = Date.now();
        expect(loggedMessages.length).to.be.greaterThan(0);
        expect(loggedMessages[0]).to.include('[INFO] Request processed');
        expect(loggedMessages[0]).to.include('GET');
        expect(loggedMessages[0]).to.include('/api/test');
        done();
      });
    });
  });
});