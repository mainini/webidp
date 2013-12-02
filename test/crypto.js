/**
 * @file Tests for crypto.js
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.4
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

var fs = require('fs'),
  forge = require('node-forge'),
  crypto = require('../src/crypto.js');


/***********************************************************
 * Generate and save CA-certificate
 **********************************************************/

// Keys
console.log('Generating CA keypair...');
var caKeys = forge.pki.rsa.generateKeyPair(2048);

// Serial
var caSerial = crypto.generateSerial();
console.log('Generated CA serialnumber: ' + caSerial);

// Certificate
var caSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'organizationalUnitName', value: 'Engineering and Information Technology' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'BFH WebID CA' }];
var caCert = crypto.createCACertificate(caSubject, caKeys, caSerial, true);

// Files
console.log('Writing CA certificate and key...');
fs.writeFileSync('certs/ca-cert.pem', forge.pki.certificateToPem(caCert));
fs.writeFileSync('certs/ca-key.pem', forge.pki.privateKeyToPem(caKeys.privateKey));


/***********************************************************
 * Generate and save server-certificate
 **********************************************************/

// Keys
console.log('Generating server keypair...');
var serverKeys = forge.pki.rsa.generateKeyPair(2048);

// Serial
var serverSerial = crypto.generateSerial();
while (serverSerial === caSerial) {
  console.log('Strange! Duplicate serialnumber! Regenerating new one...');
  serverSerial = crypto.generateSerial();
}
console.log('Generated server serialnumber: ' + serverSerial);

// Certificate
var serverSubject = [{ name: 'organizationName', value: 'Berne University of Applied Sciences' },
               { name: 'countryName', value: 'CH' },
               { name: 'commonName', value: 'localhost' }];
var serverCert = crypto.createServerCertificate(serverSubject, '127.0.0.1', serverKeys, serverSerial, caCert, caKeys, true);

// Files
console.log('Writing server certificate and key...');
fs.writeFileSync('certs/server-cert.pem', forge.pki.certificateToPem(serverCert));
fs.writeFileSync('certs/server-key.pem', forge.pki.privateKeyToPem(serverKeys.privateKey));


/***********************************************************
 * Generate and save WebID-certificate
 **********************************************************/


// Keys
console.log('Generating WebID keypair...');
var webidKeys = forge.pki.rsa.generateKeyPair(2048);

// Serial
var webIDSerial = crypto.generateSerial();
while ((webIDSerial === caSerial) || (webIDSerial == serverSerial)) {
  console.log('Strange! Duplicate serialnumber! Regenerating new one...');
  webIDSerial = crypto.generateSerial();
}
console.log('Generated WebID serialnumber: ' + webIDSerial);

// Certificate
var id='test';
var name='Justus Testus';
var email='justus.testus@bfh.ch';
var webidCert = crypto.createWebIDCertificate(id, name, email, webidKeys, webIDSerial, caCert, caKeys, true).cert;

// Files
console.log('Writing WebID certificate and key...');
fs.writeFileSync('certs/webid-cert.pem', forge.pki.certificateToPem(webidCert));
fs.writeFileSync('certs/webid-key.pem', forge.pki.privateKeyToPem(webidKeys.privateKey));

console.log('Writing WebID PKCS#12 container...');
var bytes = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(
              webidKeys.privateKey, [webidCert], null,
              {generateLocalKeyId: true, friendlyName: 'test'})).getBytes();
fs.writeFileSync('certs/webid-cert.p12', bytes,  {encoding: 'binary'});

console.log('Writing WebID informations...');
var webidData = 'id:       ' + id + '\nname:     ' + name + '\nemail:    ' + email + '\n' +
                'modulus:  ' + webidKeys.publicKey.n.toString(16) + '\nexponent: ' + webidKeys.publicKey.e.toString() + '\n';
fs.writeFileSync('certs/webid-infos.txt', webidData);

console.log('Everything done!');
