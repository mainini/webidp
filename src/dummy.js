/**
 * @file dummy-backend allowing all uid/pw-combinations for authentication
 * @copyright 2013-2014 BFH - Bern University of Applied Sciences -- {@link http://bfh.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.6
 *
 * A dummy authentication backend allowing all usernames and passwords to login.
 * Only useful for testing.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';


/***********************************************************
 * Function definitions
 **********************************************************/

module.exports.authenticate = function authenticate(uid, password, callback) {
  callback(null, { uid: uid,
                   name: 'Dummy user <'  + uid + '>',
                   email: uid + '@dummy.org' });
};
