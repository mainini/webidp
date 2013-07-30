/**
 * @file Interface to the PKI for WebIDP 
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

var fs = require('fs'),
  forge = require('node-forge'),
  cfg = require('./config.js'),
  triplestore = require('./triplestore.js');

var pki = forge.pki;
var store = triplestore.TripleStore.getInstance();

/***********************************************************
 * Function definitions
 **********************************************************/

var caCert = forge.pki.certificateFromPem(fs.readFileSync(cfg.get('ca:cert'), 'utf8'));
var caKey = forge.pki.privateKeyFromPem(fs.readFileSync(cfg.get('ca:key'), 'utf8'));

var createCertificate = function createCertificate(id, cn, email, publicKey) {

  var subject = [{'name': 'commonName', 'value': cn}];
  for (var k in cfg.get('webid:subject')) {
    subject.push({'name': k, 'value': cfg.get('webid:subject')[k]});
  }

  var cert = pki.createCertificate();
  cert.setSubject(subject);
  cert.setIssuer(caCert.subject.attributes);
  cert.publicKey = publicKey;
  cert.serialNumber = store.getNextSerialNumber();

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setExtensions([{ name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: 'true', },
    { name: 'extKeyUsage', clientAuth: true, emailProtection: true },
    { name: 'subjectAltName', critical: true, altNames: [
      { type: 6, value: cfg.getIdUri(id) },
      { type: 1, value: email }
    ]},
    { name: 'nsCertType', client: true },
    { name: 'subjectKeyIdentifier' }]);

  if (cfg.get('webid:sha256')) {
    cert.sign(caKey, forge.md.sha256.create());
  } else {
    cert.sign(caKey);
  }

  return cert;
};

var keys = pki.rsa.generateKeyPair(1024);
var cert = createCertificate('test', 'Justus Testus', 'justus.testus@bfh.ch', keys.publicKey);
console.log(pki.certificateToPem(cert));
