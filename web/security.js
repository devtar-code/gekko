const Joi = require('joi');

// Configure logging
const logger = {
  info: (message, meta) => console.log(`[INFO] ${message}`, meta),
  warn: (message, meta) => console.warn(`[WARN] ${message}`, meta),
  error: (message, meta) => console.error(`[ERROR] ${message}`, meta)
};

// Input validation schemas
const configValidationSchema = Joi.object({
  tradingAdvisor: Joi.object({
    enabled: Joi.boolean().default(true),
    method: Joi.string().required(),
    candleSize: Joi.number().integer().min(1).max(1440).required(),
    historySize: Joi.number().integer().min(1).max(1000).required()
  }).required(),
  watch: Joi.object({
    exchange: Joi.string().required(),
    currency: Joi.string().required(),
    asset: Joi.string().required()
  }).required(),
  paperTrader: Joi.object({
    enabled: Joi.boolean().default(true),
    reportInCurrency: Joi.boolean().default(true),
    simulationBalance: Joi.object({
      asset: Joi.number().positive().default(1),
      currency: Joi.number().positive().default(1000)
    }).optional().default({ asset: 1, currency: 1000 }),
    feeMaker: Joi.number().min(0).max(1).default(0.15),
    feeTaker: Joi.number().min(0).max(1).default(0.25),
    feeUsing: Joi.string().valid('maker', 'taker').default('maker'),
    slippage: Joi.number().min(0).max(1).default(0.05)
  }).optional(),
  trader: Joi.object({
    enabled: Joi.boolean().default(false),
    key: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    secret: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    username: Joi.string().optional(),
    passphrase: Joi.string().optional()
  }).optional()
});

// Koa middleware for validation
const validateConfig = function *(next) {
  try {
    const { error, value } = configValidationSchema.validate(this.request.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Configuration validation failed', {
        errors: error.details.map(d => d.message),
        body: this.request.body
      });
      this.status = 400;
      this.body = {
        error: 'Invalid configuration',
        details: error.details.map(d => d.message)
      };
      return;
    }

    // Sanitize and convert types
    if (value.tradingAdvisor) {
      value.tradingAdvisor.candleSize = parseInt(value.tradingAdvisor.candleSize, 10);
      value.tradingAdvisor.historySize = parseInt(value.tradingAdvisor.historySize, 10);
    }

    this.request.body = value;
    yield next;
  } catch (err) {
    logger.error('Validation error', { error: err.message, stack: err.stack });
    this.status = 500;
    this.body = { error: 'Internal validation error' };
  }
};

// Koa middleware for request logging
const requestLogger = function *(next) {
  const start = Date.now();
  yield next;
  const duration = Date.now() - start;
  logger.info('Request processed', {
    method: this.method,
    url: this.url,
    status: this.status,
    duration: `${duration}ms`,
    ip: this.ip,
    userAgent: this.get('User-Agent')
  });
};

// Koa middleware for error handling
const errorHandler = function *(next) {
  try {
    yield next;
  } catch (err) {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: this.url,
      method: this.method,
      ip: this.ip,
      userAgent: this.get('User-Agent')
    });

    // Don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.status = err.status || 500;
    this.body = {
      error: isProduction ? 'Internal server error' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    };
  }
};

// API key validation middleware for Koa
const validateApiKey = function *(next) {
  const apiKey = this.headers['x-api-key'] || this.query.apiKey;
  
  if (!apiKey) {
    this.status = 401;
    this.body = { error: 'API key required' };
    return;
  }
  
  // In production, validate against stored API keys
  if (process.env.NODE_ENV === 'production' && apiKey !== process.env.API_KEY) {
    logger.warn('Invalid API key attempt', { ip: this.ip });
    this.status = 401;
    this.body = { error: 'Invalid API key' };
    return;
  }
  
  yield next;
};

module.exports = {
  validateConfig,
  errorHandler,
  requestLogger,
  validateApiKey,
  logger,
  configValidationSchema
};
