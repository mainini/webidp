/**
 * @file Configuration helper for WebIDP
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
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

'use strict';

var cfg = require('nconf');

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
  'ca': {
    'cert': 'config/ca.crt',
    'key': 'config/ca.key'
  },
  'db': {
    'enabled': true,
    'name': 'webidp',
    'server': 'localhost',
    'port': '27017',
    'overwrite': false
  },
  'webid': {
    'subject': {},
    'sha256': true,
    'fragment' : 'me'
  },
  'pageTitle' : 'WebIDP --- '
});

module.exports.get = function get(key) {
  return cfg.get(key);
};

var getIdUri = function getIdUri(id) {
  return 'https://' + cfg.get('server:fqdn') + ':' + cfg.get('server:port') + '/id/' + id;
};

module.exports.getIdUri = getIdUri;

module.exports.getIdUriFull = function getIdUriFull(id) {
  return getIdUri(id) + '#' + cfg.get('webid:fragment');
};
