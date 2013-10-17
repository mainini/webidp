/**
 * @file connect-based node.js-server for WebIDP
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.2
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 *
 * THIS FILE HAS NO DEFINITIVE LICENSING INFORMATION.
 * LICENSE IS SUBJECT OF CHANGE ANYTIME SOON - DO NOT DISTRIBUTE!
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var fs = require('fs'),
  https = require('https'),
  _ = require('underscore'),
  connect = require('connect'),
  render = require('connect-render'),
  webid = require('webid'),
  rest = require('connect-rest'),
  cfg = require('./config.js'),
  triplestore = require('./triplestore.js'),
  crypto = require('./crypto.js');


///////////////////// Setup triplestore

var store = triplestore.TripleStore.getInstance();


/***********************************************************
 * Function definitions
 **********************************************************/

var _error = function _error (req, res, next, code, error) {
  res.statusCode = (typeof code === 'undefined') ? 500 : code;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  error = (typeof error === 'undefined') ?  'Something bad happened...' : error;
  res.render('error.html', { 'debugMode': cfg.get('debugMode'),
                             'error': error });
};

var _notFound = function _notFound(req, res, next) {
  return _error(req, res, next, 404, 'Page not found!');
};

var _create = function _create(req, res) {
  if (req.body.spkac && ! req.session.newId) {
    // @todo check challenge

    var uid = req.session.user.uid;
    var name = req.session.user.name;
    var email = req.session.user.email;

    var id = { 'uri': cfg.getIdUri(uid),
               'hash': crypto.sha256(req.body.label) };
    id.full = id.uri + '#' + id.hash;

    var serial = crypto.generateSerial();
    var cert = crypto.createWebIDCertificate(id.full, name, email, req.body.spkac, serial, cfg.get('webid:sha256'));
    store.addId(id, name, req.body.label, cert.cert.publicKey.n.toString(16), cert.cert.publicKey.e.toString());
    req.session.newId = true;
 
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/x-x509-user-cert');
    res.write(cert.der);
    res.end();

  } else {

    if (req.body.uid) {
      req.session.user = { uid: req.body.uid,
                           name: 'Justus Testus',
                           email: 'justus.testus@bfh.ch' };
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');

    res.render('create.html', { 'debugMode': cfg.get('debugMode'),
                                'challenge': crypto.generateChallenge(),
                                'user': req.session.user,
                                'webId': req.session.webId,
                                'newId': req.session.newId });
  }

};

var _profile = function _profile (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  res.render('profile.html', { 'debugMode': cfg.get('debugMode'),
                               'webId': req.session.webId });
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

var _sparql = function _sparql (req, res) {
  var result;
  if (req.body.query) {
    result = store.query(req.body.query);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  res.render('sparql.html', { 'result': result,
                              'debugMode': cfg.get('debugMode') });
};


var _doLogin = function _doLogin (req, res, next) {
  if (req.session.webId) {
    next();
  } else {

    var certificate = req.connection.getPeerCertificate();
    if (_.isEmpty(certificate)) {
      next();
    } else {

      if (!req.connection.authorized) {

        _error(req, res, next, 401, 'Authorisation failed: Certificate signed by unknown authority!');

      } else {

        new webid.VerificationAgent(certificate).verify(function _verifySuccess (result) {
          // WebID-verification was successful!

          req.session.webId = new webid.Foaf(result).parse();
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
  }
};

var _hasLabel = function _hasLabel(req, content, callback) {
  var result = null;
  if (!req.session || !req.session.user || ! req.session.user.uid) {

    result = new Error('Unauthorized!');
    result.statusCode = 401;

  } else {

    if (content.label) {
      if (content.label.toString().match(/[^A-Za-z0-9_\s\-]/g)) {
        result = new Error('Invalid character in label!');
        result.statusCode = 400;
      } else {
        store.hasLabel(req.session.user.uid, content.label, function _labelCB(status) {
          return callback(null, { status: status });
        });
      }
    } else {
      result = new Error('Missing/invalid argument!');
      result.statusCode = 400;
    }

  }

  if (result !== null) {      // preventing that the response gets sent out if the callback has already been returned above
    return callback(result);
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

var sslApp = connect();
sslApp.use(connect.logger(cfg.get('server:logformat')));
sslApp.use(connect.bodyParser());
sslApp.use(connect.cookieParser());
sslApp.use(connect.session({ key: 'session', secret: crypto.generateChallenge()}));
sslApp.use(render({ root: './views', layout: false, cache: cfg.get('server:cacheTemplates') }));

if (cfg.get('debugMode')) {
  sslApp.use('/static', connect.directory('static'));
  sslApp.use('/sparql', _sparql);
}

sslApp.use('/static', connect.static('static'));
sslApp.use('/id', _id);             // @feature Content-negotiation if retrieved by human

// Everything below is authenticated!
sslApp.use('/', _doLogin);

sslApp.use('/create', _create);

sslApp.use('/profile', _profile);

sslApp.use(rest.rester({ context: '/api' }));
rest.post('haslabel', _hasLabel, { 'label': 'Some label' });
sslApp.use('/api/', _notFound);

sslApp.use('/', _profile);

sslApp.use(_notFound);

https.createServer(serverOptions, sslApp).listen(cfg.get('server:port'));
