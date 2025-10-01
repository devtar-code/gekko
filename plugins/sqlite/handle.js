var _ = require('lodash');
var fs = require('fs');

var util = require('../../core/util.js');
var config = util.getConfig();
var dirs = util.dirs();

var adapter = config.sqlite;

// verify the correct dependencies are installed
var pluginHelper = require(dirs.core + 'pluginUtil');
var pluginMock = {
  slug: 'sqlite adapter',
  dependencies: adapter.dependencies,
};

var cannotLoad = pluginHelper.cannotLoad(pluginMock);
if (cannotLoad) util.die(cannotLoad);

// should be good now
if (config.debug) var sqlite3 = require('sqlite3').verbose();
else var sqlite3 = require('sqlite3');

var plugins = require(util.dirs().gekko + 'plugins');

var version = adapter.version;

var dbName = config.watch.exchange.toLowerCase() + '_' + version + '.db';
var dir = dirs.gekko + adapter.dataDirectory;

var fullPath = [dir, dbName].join('/');

var mode = util.gekkoMode();
if (mode === 'realtime' || mode === 'importer') {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
} else if (mode === 'backtest') {
  if (!fs.existsSync(dir)) util.die('History directory does not exist.');

  if (!fs.existsSync(fullPath))
    util.die(
      `History database does not exist for exchange ${
        config.watch.exchange
      } at version ${version}.`
    );
}

// Cache database connections
var dbConnections = {};

module.exports = {
  initDB: (readOnly) => {
    var key = fullPath + (readOnly ? '_ro' : '_rw');
    
    // Return cached connection if exists
    if (dbConnections[key] && dbConnections[key].open) {
      return dbConnections[key];
    }
    
    var journalMode = config.sqlite.journalMode || 'PERSIST';
    var syncMode = journalMode === 'WAL' ? 'NORMAL' : 'FULL';
  
    // For readonly, check if file exists first
    if (readOnly && !fs.existsSync(fullPath)) {
      console.log('Database file does not exist yet for readonly access:', fullPath);
      return null;
    }
    
    // Always allow creation for write mode, only readonly for read mode
    var dbMode = readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
    
    try {
      var db = new sqlite3.Database(fullPath, dbMode, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          return null;
        }
      });
      
      db.run('PRAGMA synchronous = ' + syncMode);
      db.run('PRAGMA journal_mode = ' + journalMode);
      db.configure('busyTimeout', 10000);
      
      // Cache the connection
      dbConnections[key] = db;
      
      return db;
    } catch(err) {
      console.error('Error initializing database:', err);
      return null;
    }
  },
  closeDB: () => {
    Object.keys(dbConnections).forEach(key => {
      if (dbConnections[key] && dbConnections[key].open) {
        dbConnections[key].close();
      }
    });
    dbConnections = {};
  }
};
