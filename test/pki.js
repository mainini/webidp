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

fs.writeFileSync('certs/ca-cert.pem', forge.pki.certificateToPem(caCert));
fs.writeFileSync('certs/ca-key.pem', forge.pki.privateKeyToPem(caKeys.privateKey));


// Generate and save server-certificate

var serverKeys = forge.pki.rsa.generateKeyPair(2048);
var serverSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'localhost' }];
var serverCert = pki.createServerCertificate(serverSubject, '127.0.0.1', serverKeys, '1', caCert, caKeys, true);

fs.writeFileSync('certs/server-cert.pem', forge.pki.certificateToPem(serverCert));
fs.writeFileSync('certs/server-key.pem', forge.pki.privateKeyToPem(serverKeys.privateKey));


// Generate and save WebID-certificate
var id='test';
var name='Justus Testus';
var email='justus.testus@bfh.ch';

var webidKeys = forge.pki.rsa.generateKeyPair(2048);
var webidCert = pki.createWebIDCertificate('test', 'Justus Testus', 'justus.testus@bfh.ch', webidKeys, '2', caCert, caKeys, true);

fs.writeFileSync('certs/webid-cert.pem', forge.pki.certificateToPem(webidCert));
fs.writeFileSync('certs/webid-key.pem', forge.pki.privateKeyToPem(webidKeys.privateKey));

var bytes = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(
              webidKeys.privateKey, [webidCert], null,
              {generateLocalKeyId: true, friendlyName: 'test'})).getBytes();
fs.writeFileSync('certs/webid-cert.p12', bytes,  {encoding: 'binary'});

var webidData = 'id:       ' + id + '\nname:     ' + name + '\nemail:    ' + email + '\n' +
                'modulus:  ' + webidKeys.publicKey.n.toString(16) + '\nexponent: ' + webidKeys.publicKey.e.toString() + '\n';
fs.writeFileSync('certs/webid-infos.txt', webidData);
