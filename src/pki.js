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
  cfg = require('./config.js');

var pki = forge.pki;


/***********************************************************
 * Function definitions
 **********************************************************/

module.exports.createCACertificate = function createCACertificate(subject, keys, serial, sha256) {
  var cert = pki.createCertificate();
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = cfg.getValidityStart();
  cert.validity.notAfter = cfg.getValidityEnd();
  cert.setExtensions([{ name: 'basicConstraints', cA: true, pathLenConstraint: 0 },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier' }]);

  if (sha256) {
    cert.sign(keys.privateKey, forge.md.sha256.create());
  } else {
    cert.sign(keys.privateKey);
  }

  return cert;
};

module.exports.createServerCertificate = function createServerCertificate(subject, ip, keys, serial, caCert, caKeys, sha256) {
  var signingKey;
  if (arguments.length <= 5) {
    sha256 = caCert;
    caCert = forge.pki.certificateFromPem(fs.readFileSync(cfg.get('ca:cert'), 'utf8'));
    signingKey = forge.pki.privateKeyFromPem(fs.readFileSync(cfg.get('ca:key'), 'utf8'));
  } else {
    signingKey = caKeys.privateKey;
  }

  var cert = pki.createCertificate();
  cert.setSubject(subject);
  cert.setIssuer(caCert.subject.attributes);
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = cfg.getValidityStart();
  cert.validity.notAfter = cfg.getValidityEnd();
  cert.setExtensions([{ name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'nsCertType', server: true },
    { name: 'subjectAltName', critical: true, altNames: [
      { type: 7, ip: ip }
    ]},
    { name: 'subjectKeyIdentifier' }]);

  if (sha256) {
    cert.sign(signingKey, forge.md.sha256.create());
  } else {
    cert.sign(signingKey);
  }

  return cert;
};

module.exports.createWebIDCertificate = function createWebIDCertificate(id, cn, email, keys, serial, caCert, caKeys, sha256) {
  var signingKey;
  if (arguments.length <= 6) {
    sha256 = caCert;
    caCert = forge.pki.certificateFromPem(fs.readFileSync(cfg.get('ca:cert'), 'utf8'));
    signingKey = forge.pki.privateKeyFromPem(fs.readFileSync(cfg.get('ca:key'), 'utf8'));
  } else {
    signingKey = caKeys.privateKey;
  }

  var subject = [{'name': 'commonName', 'value': cn}];
  for (var k in cfg.get('webid:subject')) {
    subject.push({'name': k, 'value': cfg.get('webid:subject')[k]});
  }

  var cert = pki.createCertificate();
  cert.setSubject(subject);
  cert.setIssuer(caCert.subject.attributes);
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = cfg.getValidityStart();
  cert.validity.notAfter = cfg.getValidityEnd();
  cert.setExtensions([{ name: 'basicConstraints', cA: false},
    { name: 'keyUsage', digitalSignature: true, },
    { name: 'extKeyUsage', clientAuth: true, emailProtection: true },
    { name: 'subjectAltName', critical: true, altNames: [
      { type: 6, value: cfg.getIdUriFull(id) },
      { type: 1, value: email }
    ]},
    { name: 'nsCertType', client: true },
    { name: 'subjectKeyIdentifier' }]);

  if (sha256) {
    cert.sign(signingKey, forge.md.sha256.create());
  } else {
    cert.sign(signingKey);
  }

  return cert;
};
