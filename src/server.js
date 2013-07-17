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
  http = require('http'),
  https = require('https'),
  _ = require('underscore'),
  nconf = require('nconf'),
  connect = require('connect'),
  redirect = require('connect-redirection'),
  webid = require('webid');
  

///////////////////// load configuration

nconf.argv().env().file({
  file: 'config/config.json'
});

nconf.defaults({
  'server': {
    'fqdn': 'localhost',
    'port': 8080,
    'sslPort': 8443,
    'key': 'config/server.key',
    'cert': 'config/server.crt',
    'logformat': ':req[host] - :remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
    'directoryListings': false,
    'redirectSSL': true
  }
});


/***********************************************************
 * Function definitions
 **********************************************************/

var _sendNotFound = function _sendNotFound (req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.statusCode = 404;
  res.end('Not found.\n');
};

var _sendError = function _sendError (req, res, error) {
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.statusCode = 500;
  if (error) {
    res.end('ERROR: ' + error + '\n');
  } else {
    res.end('ERROR: Something bad happened\n');
  }
};

var _redirectSSL = function _redirectSSL (req, res) {
  res.redirect(301, 'https://' + nconf.get('server:fqdn') + ':' + nconf.get('server:sslPort') + req.url);
};


var _doLogin = function _doLogin (req,res) {
  // this function partly borrows from https://github.com/magnetik/node-webid-demo/ - thanks!

  try {
    var certificate = req.connection.getPeerCertificate();

    if (!_.isEmpty(certificate)) {

      var verifAgent = new webid.VerificationAgent(certificate);
      verifAgent.verify(function _verifySuccess (result) {

        var foaf = new webid.Foaf(result);
//        req.session.profile = foaf.parse();
//        req.session.identified = true;
//        res.redirect('/profile');
        res.end(foaf);

      }, function _verifyError(result) {
        var message;
        switch (result) {
        case 'certificateProvidedSAN':
          message = 'No valide Certificate Alternative Name in your certificate';
          break;
        case 'profileWellFormed':
          message = 'Can\'t load your foaf file (RDF may not be valid)';
          break;
        case 'falseWebID':
          message = 'Your certificate public key is not the one of the FOAF file';
          break;
        case 'profileAllKeysWellFormed':
          message = 'Missformed WebID';
          break;
        default:
          message = 'Unknown WebID error';
          break;
        }
        _sendError(req, res, message);

      });

    } else {
      throw new Error('Certificate not provided');
    }
  } catch (e) {
    _sendError(req, res, e.message);
  }
};

/***********************************************************
 * Main application
 **********************************************************/

///////////////////// Setup non-SSL-server

var app = connect();
app.use(connect.logger(nconf.get('server:logformat')));
app.use(redirect());
if (nconf.get('server:directoryListings')) { app.use('/static', connect.directory('static')); }
app.use('/static', connect.static('static'));
app.use('/id', connect.static('static'));
if (nconf.get('server:redirectSSL')) { app.use(_redirectSSL); }
app.use(_sendNotFound);

http.createServer(app).listen(nconf.get('server:port'));


///////////////////// Setup SSL-server

var serverOptions = {
  key: fs.readFileSync(nconf.get('server:key')),
  cert: fs.readFileSync(nconf.get('server:cert')),
  requestCert: true
};

var sslApp = connect();
sslApp.use(connect.logger(nconf.get('server:logformat')));
if (nconf.get('server:directoryListings')) { sslApp.use('/static', connect.directory('static')); }
sslApp.use('/static', connect.static('static'));
sslApp.use('/private', _doLogin);
sslApp.use(_sendNotFound);

https.createServer(serverOptions, sslApp).listen(nconf.get('server:sslPort'));
