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
var connect = require('connect'),
//  webid = require('webid'),
  nconf = require('nconf'),
  fs = require('fs'),
  https = require('https');


/***********************************************************
 * Main application
 **********************************************************/

//////////////////// load configuration

nconf.argv().env().file({
  file: 'config/config.json'
});

nconf.defaults({
  'server': {
    'port': 8080,
    'key': 'config/server.key',
    'cert': 'config/server.crt',
    'logging': 'dev'
  }
});

//////////////////// setup server


var app = connect()
  .use(connect.logger(nconf.get('server:logging')))
  .use(connect.static('static'))
  .use(connect.directory('static'))
  .use(function(req, res){
    res.end('hello world\n');
  });

var options = {
  key: fs.readFileSync(nconf.get('server:key')),
  cert: fs.readFileSync(nconf.get('server:cert')),
  requestCert: false
};

https.createServer(options, app).listen(nconf.get('server:port'));
