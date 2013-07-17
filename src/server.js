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
 * @todo document functions
 * @todo templated html-output
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
  

///////////////////// initialise configuration

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
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');

  res.end('Not found.\n');
};

var _sendError = function _sendError (req, res, error) {
  res.statusCode = 500;
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');

  if (error) {
    res.end('ERROR: ' + error + '\n');
  } else {
    res.end('ERROR: Something bad happened\n');
  }
};

var _redirectSSL = function _redirectSSL (req, res) {
  res.redirect(301, 'https://' + nconf.get('server:fqdn') + ':' + nconf.get('server:sslPort') + req.url);
};

var _profile = function _profile (req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');

  if (req.session.identified) {
    res.statusCode = 200;
    res.write('Welcome back, ' + req.session.parsedProfile.name + '!\n');
    res.end('You have successfully authenticated using your WebID ' + req.session.parsedProfile.webid + '.\n');
  } else {
    res.statusCode = 401;
    res.end('Unauthorized!\n');
  }
};

var _doLogin = function _doLogin (req,res) {
  var certificate = req.connection.getPeerCertificate();
  if (_.isEmpty(certificate)) {

    _sendError(req, res, 'Certificate not provided!');

  } else {

    new webid.VerificationAgent(certificate).verify(function _verifySuccess (result) {

      // WebID-verification was successful!

      req.session.profile = result;
      req.session.parsedProfile = new webid.Foaf(result).parse();
      req.session.identified = true;
      res.redirect('/profile');

    }, function _verifyError(result) {

      // Failed WebID-verification!

      var msg;
      switch (result) {
      case 'certificateProvidedSAN':
        msg = 'No valid Subject Alternative Name in certificate!';
        break;
      case 'profileWellFormed':
        msg = 'Error while loading FOAF-profile (RDF not valid?)!';
        break;
      case 'falseWebID':
        msg = 'Certificate public key doesn\'t match FOAF-profile!';
        break;
      case 'profileAllKeysWellFormed':
        msg = 'Missformed WebID!';
        break;
      default:
        msg = 'Unknown WebID error!';
        break;
      }

      _sendError(req, res, msg);

    });

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

app.use('/id', connect.static('static'));       // @todo temporary hack for the WebID...

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
sslApp.use(redirect());
sslApp.use(connect.cookieParser());
sslApp.use(connect.session({ key: 'session', secret: Math.random().toString() }));

if (nconf.get('server:directoryListings')) { sslApp.use('/static', connect.directory('static')); }
sslApp.use('/static', connect.static('static'));

sslApp.use('/profile', _profile);
sslApp.use(_doLogin);
sslApp.use(_sendNotFound);

https.createServer(serverOptions, sslApp).listen(nconf.get('server:sslPort'));
