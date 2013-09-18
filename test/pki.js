/**
 * @file Tests for pki.js
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

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var forge = require('node-forge'),
  pki = require('../src/pki.js');

var webidKeys = forge.pki.rsa.generateKeyPair(1024);
var webid = pki.createCertificate('test', 'Justus Testus', 'justus.testus@bfh.ch', webidKeys.publicKey, '01');

var caKeys = forge.pki.rsa.generateKeyPair(1024);
var caSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'organizationalUnitName', value: 'Engineering and Information Technology' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'BFH WebID CA' }];
var start = new Date();
var end = new Date();
end.setFullYear(start.getFullYear() + 1);
var caCert = pki.createCACertificate(caSubject, caKeys, start, end, 0, true);

var serverKeys = forge.pki.rsa.generateKeyPair(1024);
var serverSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'localhost' }];

var serverCert = pki.createServerCertificate(serverSubject, caSubject, '127.0.0.1', serverKeys, caKeys, start, end, 1, true);

console.log('WebID-certificate:');
console.log(forge.pki.certificateToPem(webid));
console.log('WebID private key:');
console.log(forge.pki.privateKeyToPem(webidKeys.privateKey));
console.log('CA-certificate:');
console.log(forge.pki.certificateToPem(caCert));
console.log('CA private key:');
console.log(forge.pki.privateKeyToPem(caKeys.privateKey));
console.log('Server-certificate:');
console.log(forge.pki.certificateToPem(serverCert));
console.log('Server private key:');
console.log(forge.pki.privateKeyToPem(serverKeys.privateKey));
