/**
 * @file Configuration helper for WebIDP
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

'use strict';

var cfg = require('nconf'),
  datejs = require('safe_datejs');

var DEFAULT_VALIDITY_START = 'now';
var DEFAULT_VALIDITY_END = '1 year';

cfg.argv().env().file({
  file: 'config/config.json'
});

cfg.defaults({
  'server': {
    'fqdn': 'localhost',
    'port': 8443,
    'cert': 'config/server-cert.pem',
    'key': 'config/server-key.pem',
    'logformat': 'default',
    'cacheTemplates': true
  },
  'ca': {
    'cert': 'config/ca-cert.pem',
    'key': 'config/ca-key.pem'
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
    'fragment': 'id',
    'validityStart': DEFAULT_VALIDITY_START,
    'validityEnd': DEFAULT_VALIDITY_END
  },
  'pageTitle': 'WebIDP --- ',
  'accountDescription': 'account',
  'debugMode': false
});

// set debugging options
if(cfg.get('debugMode')) {
  cfg.set('server:logformat', 'dev');
  cfg.set('server:cacheTemplates', false);
}

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

var getValidityStart = function getValidityStart() {
  var date;

  if (cfg.get('webid:validityStart') === 'now') {
    date = new Date();
  } else {
    date = new Date(cfg.get('webid:validityStart'));
  }

  if (isNaN(date.valueOf())) {
    console.log('ERROR: Invalid date specified for webid:validityStart, reverting to default!');
    cfg.set('webid:validityStart', DEFAULT_VALIDITY_START);
    return getValidityStart();
  } else {
    return date;
  }
};
module.exports.getValidityStart = getValidityStart;

var getValidityEnd = function getValidityEnd() {
  var date = getValidityStart().AsDateJs();
  var end = cfg.get('webid:validityEnd');

  var match = end.match(/([0-9]+) years?/);
  if(match) {
    date.addYears(parseInt(match[1], 10));
  } else {
    match = end.match(/([0-9]+) months?/);
    if (match) {
      date.addMonths(parseInt(match[1], 10));
    } else {
      match = end.match(/([0-9]+) days?/);
      if (match) {
        date.addDays(parseInt(match[1], 10));
      } else {
        match = end.match(/([0-9]+) hours?/);
        if (match) {
          date.addHours(parseInt(match[1], 10));
        } else {
          match = end.match(/([0-9]+) minutes?/);
          if (match) {
            date.addMinutes(parseInt(match[1], 10));
          } else {
            date = new Date(end);
          }
        }
      }
    }
  }

  if (isNaN(date.valueOf())) {
    console.log('ERROR: Invalid date specified for webid:validityEnd, reverting to default!');
    cfg.set('webid:validityEnd', DEFAULT_VALIDITY_END);
    return getValidityEnd();
  } else {
    return date;
  }
};
module.exports.getValidityEnd  = getValidityEnd;
