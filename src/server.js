/**
 * @file connect-based node.js-server for WebIDP
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.3
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

//////////////////// Plain client API

////////// Unauthenticated functions

/**
 * Renders an error-page to the client with the specified code and error.
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 * @param   {Function}                next      Next handler in chain
 * @param   {Number}                  code      HTTP-errorcode to use
 * @param   {String}                  error     String describing the error 
 */
var _error = function _error (req, res, next, code, error) {
  res.statusCode = (typeof code === 'undefined') ? 500 : code;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  error = (typeof error === 'undefined') ?  'Something bad happened...' : error;
  res.render('error.html', { 'debugMode': cfg.get('debugMode'),
                             'error': error });
};

/**
 * Prepares a wrapped _error-function returning not-found (404) errors. 
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 * @param   {Function}                next      Next handler in chain
 * @returns {Function}                A wrapped _error-Function 
 */
var _notFound = function _notFound(req, res, next) {
  return _error(req, res, next, 404, 'Page not found!');
};

/**
 * Serves the FOAF-profile of a WebID.
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 * @param   {Function}                next      Next handler in chain
 */
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

/**
 * Backend-handler for the 'sparql'-view accessible only in debug mode.
 * The sparql-view provides a simple interface to the triplestore for direct SPARQL-
 * queries.
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 */
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


////////// Authenticated functions

/**
 * Login-handler - tries to identify a user with a WebID. If the identification was successful,
 * req.session.webId is set. The function either calls the next handler in chain or an error-function.
 * 
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 * @param   {Function}                next      Next handler in chain
 */
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

/**
 * Backend-handler for the 'create'-view where the user logs in and creates his WebID.
 * The following cases can be distinguished:
 *
 * 1) no SPKAC was provided
 *    Either user has or has not been authenticated with a WebID or has just logged in using 
 *    the userdirectory. Handling of these cases is done in the view. Also, this case handles
 *    the req.session.newId-flag set by 2) or sets the user-attributes returned by the userdirectory.
 * 2) a SPKAC was sent in the body and req.session.newId is not set
 *    In this case, checking/validation will be done and a new WebID created and sent back to
 *    the user. Also, req.session.newId will be set to prevent the user from generating more
 *    than one WebID per session. 
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 * @param   {Function}                next      Next handler in chain
 */
var _create = function _create(req, res, next) {
  if (req.body.spkac && ! req.session.newId) {
    // @todo check challenge

    var uid = req.session.user.uid;
    var name = req.session.user.name;
    var email = req.session.user.email;

    var id = { 'uid': uid,
               'uri': cfg.getIdUri(uid),
               'hash': crypto.sha256(req.body.label) };
    id.full = id.uri + '#' + id.hash;

    // self-calling closure repeatedly called if duplicate serial numbers are generated
    var serial;
    var serialGenerator = (function serialGenerator(serialExists) {
      try {
        if (serialExists) {
          serial = crypto.generateSerial();
          store.serialExists(serial, serialGenerator);
        } else {
          var cert = crypto.createWebIDCertificate(id.full, name, email, req.body.spkac, serial, cfg.get('webid:sha256'));
          store.addId(id, name, email, req.body.label, cert);
          req.session.newId = true;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/x-x509-user-cert');
          res.write(new Buffer(cert.der, 'binary'));
          res.end();
        }
      } catch (e) {
        _error(req, res, next, 500, e.message);
      }
    }) (true);

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

/**
 * Backend-handler for the 'profile'-view used to administrate the WebID(s)
 *
 * @param   {http.IncomingMessage}    req       The incomming request of the user 
 * @param   {http.ServerResponse}     res       The outgoing response of the server
 */
var _profile = function _profile (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  try {
    store.getWebIDData(null, function _dataCB(data) {
      res.render('profile.html', { 'debugMode': cfg.get('debugMode'),
                                   'webId': req.session.webId,
                                   'data': JSON.stringify(data) });
    });
  } catch (e) {
    res.render('profile.html', { 'debugMode': cfg.get('debugMode'),
                                 'webId': req.session.webId });
  }
 
};


//////////////////// RESTful-API

/**
 * Restful API-function for checking if a given user already has a WebID with a given
 * label. Calls to this function must have been authorized before. 
 * Either returns an error or a JSON-object containing a status-attribute (boolean) 
 * indicating if the given label already exists.
 *
 * @param   {Object}                  req       A request-object given by connect-rest
 * @param   {Object}                  content   JSON-parsed HTTP-body of the request
 * @param   {Function}                callback  Next handler in chain
 * @returns {Object}                  Returns a call to callback
 */
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

/**
 * Restful API-function returning all WebIDs the logged-in user has access to.

 * @param   {Object}                  req       A request-object given by connect-rest
 * @param   {Object}                  content   JSON-parsed HTTP-body of the request
 * @param   {Function}                callback  Next handler in chain
 * @returns {Object}                  Returns a call to callback
 */
var _getWebIDData = function _getWebIDData(req, content, callback) {
  var result = null;
  if (!req.session.webId) {

    result = new Error('Unauthorized!');
    result.statusCode = 401;
    callback(result);

  } else {
    try {
      store.getWebIDData(null, function _dataCB(data) {
        return callback(null, data);
      });
    } catch (e) {
      result = new Error(e.message);
      result.statusCode = 500;
      callback(result);
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

sslApp.use(rest.rester({ context: '/api' }));       // @todo disable logging
rest.post('haslabel', _hasLabel, { 'label': 'Some label' });
rest.get('webids', _getWebIDData);
sslApp.use('/api/', _notFound);

sslApp.use('/', _profile);

sslApp.use(_notFound);

https.createServer(serverOptions, sslApp).listen(cfg.get('server:port'));
