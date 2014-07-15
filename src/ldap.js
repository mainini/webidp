/**
 * @file directory-backend for connecting to ldap-servers.
 * @copyright 2013-2014 BFH - Bern University of Applied Sciences -- {@link http://bfh.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.6
 *
 * A minimal authentication backend for authenticating users against an LDAP-directory.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var ldapauth = require('ldapauth'),
    cfg = require('./config.js');

var _ldap = new ldapauth(cfg.get('directory:config'));


/***********************************************************
 * Function definitions
 **********************************************************/

module.exports.authenticate = function authenticate(uid, password, callback) {
  _ldap.authenticate(uid, password, function loginCallback(err,user) {
    if (err) {
      callback(err, user);
    } else {
      callback(null, { uid: uid,
                       name: user.displayName,
                       email: user.mail });
    }
  });
};
