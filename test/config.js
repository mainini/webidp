/**
 * @file Tests for config.js
 * @copyright 2013-2014 BFH - Bern University of Applied Sciences -- {@link http://bfh.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.6
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var cfg = require('../src/config.js');

console.log('IdUri           : ' + cfg.getIdUri('test'));
console.log('ValidityStart   : ' + cfg.getValidityStart());
console.log('ValidityEnd     : ' + cfg.getValidityEnd());
