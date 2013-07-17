/**
 * @file connect-based node.js-server for WebIDP
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.1
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 *
 * THIS FILE HAS NO DEFINITIVE LICENSING INFORMATION.
 * LICENSE IS SUBJECT OF CHANGE ANYTIME SOON - DO NOT DISTRIBUTE!
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 *
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var fs = require('fs'),
  https = require('https'),
  nconf = require('nconf'),
  connect = require('connect');
//  webid = require('webid'),
  

///////////////////// load configuration

nconf.argv().env().file({
  file: 'config/config.json'
});

nconf.defaults({
  'server': {
    'port': 8080,
    'key': 'config/server.key',
    'cert': 'config/server.crt',
    'logging': 'dev',
    'directoryListings': true
  }
});


/***********************************************************
 * Function definitions
 **********************************************************/

var _sendNotFound = function _sendNotFound(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.statusCode = 404;
  res.end('Not found.\n');
};


/***********************************************************
 * Main application
 **********************************************************/

var serverOptions = {
  key: fs.readFileSync(nconf.get('server:key')),
  cert: fs.readFileSync(nconf.get('server:cert')),
  requestCert: false
};

var app = connect();
app.use(connect.logger(nconf.get('server:logging')));
if(nconf.get('server:directoryListings')) { app.use('/static', connect.directory('static')); }
app.use('/static', connect.static('static'));
app.use(_sendNotFound);

https.createServer(serverOptions, app).listen(nconf.get('server:port'));
