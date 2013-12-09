/**
 * @file directory-backend for connecting to ldap-servers.
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.6
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
