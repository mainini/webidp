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
  crypto = require('crypto'),
  https = require('https'),
  _ = require('underscore'),
  connect = require('connect'),
  render = require('connect-render'),
  webid = require('webid'),
  cfg = require('./config.js'),
  triplestore = require('./triplestore.js');


///////////////////// Setup triplestore

var store = triplestore.TripleStore.getInstance();


/***********************************************************
 * Function definitions
 **********************************************************/

var _error = function _error (req, res, next, code, error) {
  res.statusCode = (typeof code === 'undefined') ? 500 : code;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  error = (typeof error === 'undefined') ?  'Something bad happened...' : error;
  res.render('error.html', { title: cfg.get('pageTitle') + 'Error! ' + error, error: error });
};

var _notFound = function _notFound(req, res, next) {
  return _error(req, res, next, 404, 'Page not found!');
};

var _profile = function _profile (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  res.render('index.html', { title: cfg.get('pageTitle') + 'Profile', parsedProfile: req.session.parsedProfile });
};

var _id = function _id(req, res, next) {

  store.getId(req.url.substr(1), function _gotId(content) {
    if (content.length === 0) {
      _notFound(req, res, next);
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/turtle; charset=UTF-8');
      res.end(content);
    }
  });
};

var _doLogin = function _doLogin (req, res, next) {
  if (req.session.identified) {
    return next();
  }

  var certificate = req.connection.getPeerCertificate();
  if (_.isEmpty(certificate)) {

    _error(req, res, next, 401, 'Authorisation failed: Certificate not provided!');

  } else {

    if (!req.connection.authorized) {

      _error(req, res, next, 401, 'Authorisation failed: Certificate signed by unknown authority!');

    } else {

      new webid.VerificationAgent(certificate).verify(function _verifySuccess (result) {
        // WebID-verification was successful!

        req.session.profile = result;
        req.session.parsedProfile = new webid.Foaf(result).parse();
        req.session.identified = true;
        next();

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
          msg = 'WebID error: ' + result;
          break;
        }
        _error(req, res, next, 401, 'Authorisation failed: ' + msg);
      });

    }
  }
};


/***********************************************************
 * Main application
 **********************************************************/

///////////////////// Setup SSL-server

var cacert = fs.readFileSync(cfg.get('ca:cert'));
https.globalAgent.options.ca = cacert;      // override default ca-certs so that request used by webid can fetch the profile...

var serverOptions = {
  key: fs.readFileSync(cfg.get('server:key')),
  cert: fs.readFileSync(cfg.get('server:cert')),
  ca: cacert,
  requestCert: true,
  rejectUnauthorized: false
};

var sslApp = connect(render({ root: './views', layout: false, cache: cfg.get('server:cacheTemplates') }));
sslApp.use(connect.logger(cfg.get('server:logformat')));
sslApp.use(connect.cookieParser());
sslApp.use(connect.session({ key: 'session', secret: crypto.randomBytes(32).toString() }));

if (cfg.get('server:directoryListings')) { sslApp.use('/static', connect.directory('static')); }
sslApp.use('/static', connect.static('static'));

sslApp.use('/id', _id);

sslApp.use('/profile', _doLogin);
sslApp.use('/profile', _profile);

sslApp.use(_notFound);

https.createServer(serverOptions, sslApp).listen(cfg.get('server:port'));
