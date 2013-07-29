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
  cfg = require('nconf'),
  connect = require('connect'),
  render = require('connect-render'),
  webid = require('webid'),
  triplestore = require('./triplestore.js');
  

///////////////////// initialise configuration

cfg.argv().env().file({
  file: 'config/config.json'
});

cfg.defaults({
  'server': {
    'fqdn': 'localhost',
    'port': 8443,
    'key': 'config/server.key',
    'cert': 'config/server.crt',
    'logformat': ':req[host] - :remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
    'directoryListings': false,
    'cacheTemplates': true
  },
  'caCertificate': 'config/ca.crt',
  'pageTitle' : 'WebIDP --- ',
  'idFragment' : 'me',
  'db': {
    'enabled': true,
    'name': 'webidp',
    'server': 'localhost',
    'port': '27017',
    'overwrite': false
  }
});


///////////////////// Setup triplestore

var store = triplestore.TripleStore.getInstance(cfg, function _storeReady() {
  store.addId('test', 'Justus Testus', 'The key label',
              'DDE3B46716DDB181E052BC165E404CDEF62B5CBFC221E364F5422B488D6CFBAD8D3E5B71BDE427C78054FD47F4C1E713877D029DB6A8EE01030260C16454A746567EC4123B1CC2A698F85FC3CAC7599CC7B94DC707B0CCBF58034E74E8623874744DB95F26C4366DB377798FDD9CFA09F7CBE658D11FD58536A544D98362A96DED9A71C461141CE019F27419128D663D35EEB0A0EA883DD81024BE7BD18021BDB232CCAAD11E8D36EEC66AE91283AA25A64C4492FDF7BF812DB19114CDD86CF54AA16EC212188A4780C43363AB20B2D6BE23658EFDA49DFFF96E18622C4D8F8F0E5C6A22619D685227598AE8DADED5585963A3005349160D12BB2E732E7AC468B0FAAEDE21ABDC97884258A363C5E7ED74977F1BBBF40FC29BBED1BAB1BABCD0660E422CFAAB3F37E2FD57E5706CAFF22403B81C8B932EE1B046CDF2C401595136BBD7185BA7A6DBCFB8C37BE0DCB79569856247ACB83DE1405BBA1CE390477463C2F2DECC39AE3663D3DCF80F43C38B7AEA3BCE617625E5A7AE0AC254AAC65A8AF751454260CA80A412AD85B822C2495E2A51A55F34C0086B47670F7216FBF32DDFDC5B43FC0853DE08D3C1EBEA365263F85EB2B61097EE7D3274C3C5B78791D47F8B68D380EA47661CC175D3666AFB0B5D11612F9159B91706C4225CAA606A75A49DC22309EF29DDB831DAB28EC7903CE23626918DD18E8781A731D6FB3649',
              65537);
});

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

var cacert = fs.readFileSync(cfg.get('caCertificate'));
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
