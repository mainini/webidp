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

'use strict';

var fs = require('fs'),
  forge = require('node-forge'),
  pki = require('../src/pki.js');


// Generate and save CA-certificate
var caKeys = forge.pki.rsa.generateKeyPair(2048);
var caSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'organizationalUnitName', value: 'Engineering and Information Technology' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'BFH WebID CA' }];
var caCert = pki.createCACertificate(caSubject, caKeys, '0', true);

fs.writeFile('ca-cert.pem', forge.pki.certificateToPem(caCert));
fs.writeFile('ca-key.pem', forge.pki.privateKeyToPem(caKeys.privateKey));


// Generate and save server-certificate

var serverKeys = forge.pki.rsa.generateKeyPair(2048);
var serverSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'localhost' }];
var serverCert = pki.createServerCertificate(serverSubject, '127.0.0.1', serverKeys, '1', caCert, caKeys, true);

fs.writeFile('server-cert.pem', forge.pki.certificateToPem(serverCert));
fs.writeFile('server-key.pem', forge.pki.privateKeyToPem(serverKeys.privateKey));


// Generate and save WebID-certificate

var webidKeys = forge.pki.rsa.generateKeyPair(2048);
var webidCert = pki.createWebIDCertificate('test', 'Justus Testus', 'justus.testus@bfh.ch', webidKeys, '2', caCert, caKeys, true);

fs.writeFile('webid-cert.pem', forge.pki.certificateToPem(webidCert));
fs.writeFile('webid-key.pem', forge.pki.privateKeyToPem(webidKeys.privateKey));
