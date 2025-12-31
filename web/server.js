const config = require('./vue/dist/UIconfig');

const Koa = require('koa');
const serve = require('koa-static');
const cors = require('koa-cors');
const _ = require('lodash');
const bodyParser = require('koa-bodyparser');
const helmet = require('koa-helmet');
const security = require('./security');

const opn = require('opn');
const server = require('http').createServer();
const Router = require('koa-router');
const router = new Router();
const ws = require('ws');
const app = new Koa();

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });

const cache = require('./state/cache');

const nodeCommand = _.last(process.argv[1].split('/'));
const isDevServer = nodeCommand === 'server' || nodeCommand === 'server.js';

// Configure CORS with whitelist (security fix)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080'
];

wss.on('connection', (ws, req) => {
  // Security: Check origin for WebSocket connections
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
    console.warn(new Date, '[WS] Connection attempt from unauthorized origin:', origin);
    ws.terminate();
    return;
  }

  // Security: Add message size limit
  ws._maxPayload = 10000; // 10KB limit
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.ping(_.noop);
  
  // Security: Validate incoming messages
  ws.on('message', (message) => {
    if (message.length > 10000) {
      console.warn(new Date, '[WS] Message too large, closing connection');
      ws.close(1009, 'Message too large');
      return;
    }
    // Additional message validation can be added here
  });
  
  ws.on('error', e => {
    console.error(new Date, '[WS] connection error:', e);
  });
});


setInterval(() => {
  wss.clients.forEach(ws => {
    if(!ws.isAlive) {
      console.log(new Date, '[WS] stale websocket client, terminiating..');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(_.noop);
  });
}, 10 * 1000);

// broadcast function
const broadcast = data => {
  if(_.isEmpty(data)) {
    return;
  }

  const payload = JSON.stringify(data);

  wss.clients.forEach(ws => {
    ws.send(payload, err => {
      if(err) {
        console.log(new Date, '[WS] unable to send data to client:', err);
      }
    });
  }
  );
}
cache.set('broadcast', broadcast);


const ListManager = require('./state/listManager');
const GekkoManager = require('./state/gekkoManager');

// initialize lists and dump into cache
cache.set('imports', new ListManager);
cache.set('gekkos', new GekkoManager);
cache.set('apiKeyManager', require('./apiKeyManager'));

// setup API routes

const WEBROOT = __dirname + '/';
const ROUTE = n => WEBROOT + 'routes/' + n;

// attach routes
const apiKeys = require(ROUTE('apiKeys'));
router.get('/api/test', async (ctx) => {
  ctx.body = { status: 'ok' };
});
router.get('/api/info', require(ROUTE('info')));
router.get('/api/strategies', require(ROUTE('strategies')));
router.get('/api/configPart/:part', require(ROUTE('configPart')));
router.get('/api/apiKeys', apiKeys.get);

const listWraper = require(ROUTE('list'));
router.get('/api/imports', listWraper('imports'));
router.get('/api/gekkos', listWraper('gekkos'));
router.get('/api/exchanges', require(ROUTE('exchanges')));

// Apply strict config validation only to endpoints that accept a full Gekko config.
// NOTE: `security.validateConfig` currently requires `watch` + `tradingAdvisor` fields,
// so it should NOT be used for endpoints with different payload shapes (like apiKeys, stopGekko, etc).
router.post('/api/addApiKey', apiKeys.add);
router.post('/api/removeApiKey', apiKeys.remove);
router.post('/api/scan', require(ROUTE('scanDateRange')));
router.post('/api/scansets', require(ROUTE('scanDatasets')));
router.post('/api/backtest', security.validateConfig, require(ROUTE('backtest')));
router.post('/api/import', security.validateConfig, require(ROUTE('import')));
router.post('/api/startGekko', security.validateConfig, require(ROUTE('startGekko')));
router.post('/api/stopGekko', require(ROUTE('stopGekko')));
router.post('/api/deleteGekko', require(ROUTE('deleteGekko')));
router.post('/api/getCandles', require(ROUTE('getCandles')));


// incoming WS:
// wss.on('connection', ws => {
//   ws.on('message', _.noop);
// });

app
  // .use(helmet({
  //   contentSecurityPolicy: {
  //     directives: {
  //       defaultSrc: ["'self'"],
  //       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vue 2 legacy
  //       styleSrc: ["'self'", "'unsafe-inline'"],
  //       imgSrc: ["'self'", "data:", "https:"],
  //       connectSrc: ["'self'", "ws:", "wss:"],
  //     },
  //   },
  //   referrerPolicy: { policy: 'same-origin' }
  // }))
  .use(security.requestLogger) // Request logging
  // .use(security.errorHandler) // Error handling
  // .use(cors({
  //   origin: (ctx) => {
  //     const origin = ctx.headers.origin;
  //     // Allow requests with no origin (like mobile apps or curl requests)
  //     if (!origin) return '*';
  //     // Check if origin is in whitelist
  //     if (allowedOrigins.includes(origin)) {
  //       return origin;
  //     }
  //     // In development, allow localhost variations
  //     if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
  //       return origin;
  //     }
  //     return false;
  //   },
  //   credentials: true,
  //   maxAge: 86400 // 24 hours
  // }))
  // .use(security.rateLimit) // Rate limiting
  .use(bodyParser({
    enableTypes: ['json', 'form', 'text'],
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb'
  }))
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve(WEBROOT + 'vue/dist'));

server.timeout = config.api.timeout || 120000;
server.on('request', app.callback());
server.listen(config.api.port, config.api.host, '::', () => {
  const host = `${config.ui.host}:${config.ui.port}${config.ui.path}`;

  if(config.ui.ssl) {
    var location = `https://${host}`;
  } else {
    var location = `http://${host}`;
  }

  console.log('Serving Gekko UI on ' + location +  '\n');


  // only open a browser when running `node gekko`
  // this prevents opening the browser during development
  if(!isDevServer && !config.headless) {
    opn(location)
      .catch(err => {
        console.log('Something went wrong when trying to open your web browser. UI is running on ' + location + '.');
    });
  }
});
