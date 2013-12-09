/**
 * @file Crypto-functions for WebIDP 
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

var fs = require('fs'),
  forge = require('node-forge'),
  cfg = require('./config.js');

var pki = forge.pki;


/***********************************************************
 * Function definitions
 **********************************************************/

//////////////////// Helpers

/**
 * Generates challenges/random data for encryption of the sessions and for
 * the clientside keypair generation with HTML-<keygen>.
 *
 * @returns {String}      32 Bytes of Base64-encoded random data
 */
module.exports.generateChallenge = function generateChallenge() {
  return forge.util.encode64(forge.random.getBytesSync(32));
};

/**
 * Generates serial numbers used when creating certificates in accordance with
 * https://tools.ietf.org/html/rfc5280#section-4.1.2.2
 * 
 * It is important to note that the number gets interpreted as signed, thus the
 * highest bit gets turned to 0 by &0x7f - reducing the number space to 2^159.
 *
 * @returns {String}      20 Bytes of random data as hexadecimal string
 */
module.exports.generateSerial = function generateSerial() {
  return forge.util.createBuffer().putByte(forge.random.getBytesSync(1).charCodeAt(0) & 0x7f).putBytes(forge.random.getBytesSync(19)).toHex();
};

/**
 * Retrieves the public key from a Signed Public Key and Challenge (SPKAC).
 * IMPORTANT: Currently neither the challenge nor the signature gets verified, 
 * this is a security risk which was accepted for the proof of concept.
 *
 * @todo Use a forge-validator-construct and verify signature and challenge.
 *       See also http://middleware.internet2.edu/pki03/presentations/10.pdf
 *
 * @param   {String}      spkac     Base64 encoded SPKAC in ASN.1 DER form.
 * @returns {Object}      A node-forge public key
 */
var spkacToPublicKey = function spkacToPublicKey(spkac) {
  var asn1 = forge.asn1.fromDer(forge.util.decode64(spkac));
  return forge.pki.publicKeyFromAsn1(asn1.value[0].value[0]);
};
module.exports.spkacToPublicKey = spkacToPublicKey;

/**
 * Hashes a given value with SHA-256.
 *
 * @param   {String}      value     The value to hash
 * @returns {String}      SHA-256 hash of the value given as hexadecimal string 
 */
module.exports.sha256 = function sha256(value) {
  var md = forge.md.sha256.create();
  md.update(value);
  return  md.digest().toHex();
};


//////////////////// Certificate creation functions

/**
 * Creates an x.509 certificate authority (CA) certificate.
 *
 * @param   {Object}      subject   Subject of the certificate, an object with attributes corresponding to DN
 * @param   {Object}      keys      A node-forge keypair (only public key used)
 * @param   {String}      serial    The serialnumber for the certificate, hexadecimal string
 * @param   {boolean}     sha256    Use SHA-256 for signing (SHA-1 when false)
 * @returns {Object}      A node-forge certificate
 */
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

/**
 * Creates an x.509 server certificate.
 *
 * @param   {Object}      subject   Subject of the certificate, an object with attributes corresponding to DN
 * @param   {String}      ip        IP-address of the server, used for subject alternate name
 * @param   {Object}      keys      A node-forge keypair (only public key used)
 * @param   {String}      serial    The serialnumber for the certificate, hexadecimal string
 * @param   {Object}      caCert    Certificate of the certificate authority used for signing, retrieved from config if omited
 * @param   {Object}      caKeys    Keypair of the certificate authority used for signing, retrieved from config if omited
 * @param   {boolean}     sha256    Use SHA-256 for signing (SHA-1 when false)
 * @returns {Object}      A node-forge certificate
 */
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

/**
 * Creates an x.509 client certificate conforming to the WebID-specification.
 * See http://www.w3.org/2005/Incubator/webid/spec/
 *
 * @param   {String}      id        URI identifying the WebID
 * @param   {Object}      cn        CommonName-attribute of the certificate, the rest of the DN is retrieved from config
 * @param   {String}      email     Email-address of the holder of the WebID
 * @param   {Object}      keys      Either a node-forge keypair or a Base64 encoded SPKAC (see above)
 * @param   {String}      serial    The serialnumber for the certificate, hexadecimal string
 * @param   {Object}      caCert    Certificate of the certificate authority used for signing, retrieved from config if omited
 * @param   {Object}      caKeys    Keypair of the certificate authority used for signing, retrieved from config if omited
 * @param   {boolean}     sha256    Use SHA-256 for signing (SHA-1 when false)
 * @returns {Object}      A node-forge certificate
 */
module.exports.createWebIDCertificate = function createWebIDCertificate(id, cn, email, keys, serial, caCert, caKeys, sha256) {
  var signingKey;
  if (arguments.length <= 6) {
    sha256 = caCert;
    caCert = forge.pki.certificateFromPem(fs.readFileSync(cfg.get('ca:cert'), 'utf8'));
    signingKey = forge.pki.privateKeyFromPem(fs.readFileSync(cfg.get('ca:key'), 'utf8'));
  } else {
    signingKey = caKeys.privateKey;
  }

  var publicKey;
  if (! keys.publicKey) {
    // not a forge-keypair, trying to parse it from SPKAC instead
    publicKey = spkacToPublicKey(keys);
  } else {
    publicKey = keys.publicKey;
  }

  var subject = [{'name': 'commonName', 'value': cn}];
  for (var k in cfg.get('webid:subject')) {
    subject.push({'name': k, 'value': cfg.get('webid:subject')[k]});
  }

  var cert = pki.createCertificate();
  cert.setSubject(subject);
  cert.setIssuer(caCert.subject.attributes);
  cert.publicKey = publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = cfg.getValidityStart();
  cert.validity.notAfter = cfg.getValidityEnd();
  cert.setExtensions([{ name: 'basicConstraints', cA: false},
    { name: 'keyUsage', digitalSignature: true, },
    { name: 'extKeyUsage', clientAuth: true, emailProtection: true },
    { name: 'subjectAltName', critical: true, altNames: [
      { type: 6, value: id },
      { type: 1, value: email }
    ]},
    { name: 'nsCertType', client: true },
    { name: 'subjectKeyIdentifier' }]);

  if (sha256) {
    cert.sign(signingKey, forge.md.sha256.create());
  } else {
    cert.sign(signingKey);
  }

  var bytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  return {
    'cert': cert,
    'der':  bytes,
    'base64DER': forge.util.encode64(bytes)
  };
};
