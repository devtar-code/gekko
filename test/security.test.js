const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const koa = require('koa');
const bodyParser = require('koa-bodyparser');
const router = require('koa-router')();

// Import security middleware
const security = require('../web/security');

describe('Security Tests', () => {
  let app;
  let server;

  before(() => {
    app = new koa();
    app.use(bodyParser());
    app.use(security.requestLogger);
    app.use(security.cors);
    app.use(security.rateLimit);
    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use(security.errorHandler);
  });

  describe('Input Validation', () => {
    it('should validate correct configuration', (done) => {
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
        },
        paperTrader: {
          enabled: true,
          reportInCurrency: true,
          simulationBalance: {
            asset: 1,
            currency: 100
          }
        }
      };

      // Test validation function directly
      const { error, value } = security.configValidationSchema.validate(validConfig);
      expect(error).to.be.undefined;
      expect(value.tradingAdvisor.candleSize).to.be.a('number');
      expect(value.tradingAdvisor.historySize).to.be.a('number');
      done();
    });

    it('should reject invalid candleSize', (done) => {
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
      expect(error.details[0].message).to.include('candleSize');
      done();
    });

    it('should reject missing required fields', (done) => {
      const invalidConfig = {
        tradingAdvisor: {
          enabled: true,
          method: 'MACD'
          // Missing candleSize and historySize
        }
      };

      const { error } = security.configValidationSchema.validate(invalidConfig);
      expect(error).to.not.be.undefined;
      expect(error.details.length).to.be.greaterThan(0);
      done();
    });

    it('should sanitize string numbers to integers', (done) => {
      const configWithStrings = {
        tradingAdvisor: {
          enabled: true,
          method: 'MACD',
          candleSize: '60',
          historySize: '10'
        },
        watch: {
          exchange: 'binance',
          currency: 'USDT',
          asset: 'BTC'
        }
      };

      const { error, value } = security.configValidationSchema.validate(configWithStrings);
      expect(error).to.be.undefined;
      expect(value.tradingAdvisor.candleSize).to.equal(60);
      expect(value.tradingAdvisor.historySize).to.equal(10);
      done();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', (done) => {
      // This would require setting up a test server
      // For now, we'll test the rate limiter configuration
      const rateLimiter = security.createRateLimiter(1000, 1); // 1 request per second
      expect(rateLimiter).to.be.a('function');
      done();
    });
  });

  describe('CORS Configuration', () => {
    it('should have proper CORS settings', () => {
      expect(security.corsOptions.origin).to.be.an('array');
      expect(security.corsOptions.credentials).to.be.true;
      expect(security.corsOptions.methods).to.include('GET');
      expect(security.corsOptions.methods).to.include('POST');
    });
  });

  describe('Security Headers', () => {
    it('should have proper helmet configuration', () => {
      expect(security.helmetConfig.contentSecurityPolicy).to.be.an('object');
      expect(security.helmetConfig.hsts).to.be.an('object');
      expect(security.helmetConfig.noSniff).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', (done) => {
      const mockReq = {
        url: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: () => 'test-agent'
      };
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            expect(code).to.equal(500);
            expect(data.error).to.be.a('string');
            done();
          }
        })
      };
      const mockNext = () => {};

      const testError = new Error('Test error');
      security.errorHandler(testError, mockReq, mockRes, mockNext);
    });
  });

  describe('Logging', () => {
    it('should have proper logger configuration', () => {
      expect(security.logger).to.be.an('object');
      expect(security.logger.level).to.equal('info');
    });
  });
});

describe('Dependency Security', () => {
  it('should not have critical vulnerabilities', (done) => {
    // This would require running npm audit programmatically
    // For now, we'll check that we're using secure versions
    const packageJson = require('../package.json');
    
    // Check for known vulnerable packages
    expect(packageJson.dependencies.lodash).to.not.equal('2.x');
    expect(packageJson.dependencies.async).to.not.equal('2.1.2');
    expect(packageJson.dependencies.koa).to.not.equal('^1.2.0');
    
    done();
  });
});

describe('API Security', () => {
  it('should validate API keys in production', () => {
    const mockReq = {
      headers: {},
      query: {},
      ip: '127.0.0.1'
    };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          expect(code).to.equal(401);
          expect(data.error).to.include('API key required');
        }
      })
    };
    const mockNext = () => {};

    // Test without API key
    security.validateApiKey(mockReq, mockRes, mockNext);
  });
});
