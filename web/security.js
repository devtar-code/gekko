const Joi = require('joi');

// Configure logging
const logger = {
  level: 'info',
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

// Flexible validation middleware - validates based on route
const validateConfig = async (ctx, next) => {
  try {
    // Skip validation for GET requests
    if (ctx.method === 'GET') {
      return await next();
    }

    const body = ctx.request.body || {};
    
    // Basic validation - ensure body is an object
    if (typeof body !== 'object' || body === null) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid request body' };
      return;
    }

    // Validate based on endpoint
    let schema = configValidationSchema;
    
    // For startGekko, backtest, import - use full validation
    if (ctx.path.includes('startGekko') || ctx.path.includes('backtest') || ctx.path.includes('import')) {
      const { error, value } = schema.validate(body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: true // Allow additional fields
      });

      if (error) {
        logger.warn('Configuration validation failed', {
          errors: error.details.map(d => d.message),
          path: ctx.path
        });
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid configuration',
          details: error.details.map(d => d.message)
        };
        return;
      }

      // Sanitize and convert types
      if (value.tradingAdvisor) {
        if (value.tradingAdvisor.candleSize) {
          value.tradingAdvisor.candleSize = parseInt(value.tradingAdvisor.candleSize, 10);
          if (isNaN(value.tradingAdvisor.candleSize) || value.tradingAdvisor.candleSize <= 0) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid candle size' };
            return;
          }
        }
        if (value.tradingAdvisor.historySize) {
          value.tradingAdvisor.historySize = parseInt(value.tradingAdvisor.historySize, 10);
          if (isNaN(value.tradingAdvisor.historySize) || value.tradingAdvisor.historySize <= 0) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid history size' };
            return;
          }
        }
      }

      ctx.request.body = value;
    } else {
      // For other endpoints, just sanitize basic types
      // Sanitize exchange names
      if (body.watch && body.watch.exchange) {
        body.watch.exchange = String(body.watch.exchange).toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      if (body.watch && body.watch.asset) {
        body.watch.asset = String(body.watch.asset).toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
      if (body.watch && body.watch.currency) {
        body.watch.currency = String(body.watch.currency).toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
    }

    await next();
  } catch (err) {
    logger.error('Validation error', { error: err.message, stack: err.stack });
    const isProduction = process.env.NODE_ENV === 'production';
    ctx.status = 500;
    ctx.body = { 
      error: isProduction ? 'Internal validation error' : err.message
    };
  }
};

// Koa v2+ async middleware for request logging
const requestLogger = async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info('Request processed', {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`,
    ip: ctx.ip,
    userAgent: ctx.get('User-Agent')
  });
};

// Koa v2+ async middleware for error handling
const errorHandler = async (ctxOrErr, nextOrReq, res, next) => {
  // Support both Koa (ctx,next) and Express-style (err, req, res, next)
  const isExpressStyle = ctxOrErr instanceof Error;
  if (isExpressStyle) {
    const err = ctxOrErr;
    const req = nextOrReq;
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.url, method: req.method, ip: req.ip });
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(500).json({ error: isProduction ? 'Internal server error' : err.message, ...(isProduction ? {} : { stack: err.stack }) });
  }

  const ctx = ctxOrErr;
  const nextKoa = nextOrReq;
  try {
    await nextKoa();
  } catch (err) {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
      ip: ctx.ip,
      userAgent: ctx.get('User-Agent')
    });

    const isProduction = process.env.NODE_ENV === 'production';
    ctx.status = err.status || 500;
    ctx.body = {
      error: isProduction ? 'Internal server error' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    };
  }
};

// API key validation middleware for Koa v2+
const validateApiKey = async function() {
  // Overloaded: Koa (ctx,next) OR Express-style (req,res,next)
  if (arguments.length >= 3 && !(arguments[0] && arguments[0].headers && arguments[1] && arguments[1].status === undefined)) {
    // Express-style: (req, res, next)
    const req = arguments[0];
    const res = arguments[1];
    const next = arguments[2];
    const apiKey = req.headers['x-api-key'] || (req.query && req.query.apiKey);
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.API_KEY) {
      logger.warn('Invalid API key attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid API key' });
    }
    return next();
  } else {
    // Koa: (ctx, next)
    const ctx = arguments[0];
    const next = arguments[1];
    const apiKey = ctx.headers['x-api-key'] || ctx.query.apiKey;
    if (!apiKey) {
      ctx.status = 401;
      ctx.body = { error: 'API key required' };
      return;
    }
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.API_KEY) {
      logger.warn('Invalid API key attempt', { ip: ctx.ip });
      ctx.status = 401;
      ctx.body = { error: 'Invalid API key' };
      return;
    }
    return next();
  }
};

// Very lightweight CORS and Rate-limiter stubs for tests
const corsOptions = {
  origin: ['*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

const cors = async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  ctx.set('Access-Control-Allow-Credentials', 'true');
  await next();
};

const createRateLimiter = (windowMs, max) => {
  let timestamps = [];
  return async (ctx, next) => {
    const now = Date.now();
    timestamps = timestamps.filter(t => now - t < windowMs);
    if (timestamps.length >= max) {
      ctx.status = 429;
      ctx.body = { error: 'Too many requests' };
      return;
    }
    timestamps.push(now);
    await next();
  };
};

// Default rate limiter: 100 requests per 15 minutes
const rateLimit = createRateLimiter(15 * 60 * 1000, 100);

// Helmet-like config stub for tests
const helmetConfig = {
  contentSecurityPolicy: {},
  hsts: {},
  noSniff: true
};

module.exports = {
  validateConfig,
  errorHandler,
  requestLogger,
  validateApiKey,
  logger,
  configValidationSchema,
  // additional exports for tests & Koa integration
  cors,
  corsOptions,
  createRateLimiter,
  rateLimit,
  helmetConfig
};
