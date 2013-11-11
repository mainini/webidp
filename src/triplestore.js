/**
 * @file Interface to triplestore for WebIDP 
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.3
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

var rdfstore = require('rdfstore'),
  cfg = require('./config.js');


var _formatHex = function formatHex(hex) {
  var result = '';
  hex = hex.toUpperCase();
  for(var i=0; i < hex.length-1; i += 2) {
    result = result + hex[i] + hex[i+1] + ':';
  }
  return result.substr(0, result.length-1);
};


/***********************************************************
 * Definition of the TripleStore-singleton
 **********************************************************/

exports.TripleStore = (function() {
  var instance = null;

///////////////////// Private singleton object

  /**
   * Private singleton instance
   */
  function PrivateConstructor() {

    /**
     * Executes a SPARQL-query on the store.
     *
     * @param   {String}        sparqlQuery   The query to execute
     * @returns {String}        Either Turtle-formatted RDF, simple triples or an error message
     */
    this.query = function query(sparqlQuery) {
      var result;
      this.store.execute(sparqlQuery, function querySuccess(success, results) {
        if (success) {
          if (sparqlQuery.match(/SELECT/i)) {
            for(var i = 0; i < results.length; i++) {
              var bindings = results[i];
              result += bindings.s.value + ' ' + bindings.p.value +  ' ' + bindings.o.value + '\n';
            }
          } else if (sparqlQuery.match(/CONSTRUCT/i)) {
            result = results.toNT();
          } else {
            if (results) {
              result = results.toString();
            }
          }
        } else {
          result = 'An error occured while executing the query!\n\n' + results.toString();
        }
      });
      return result;
    };

    /**
     * Creates a new FOAF-profile and loads it into the store.
     *
     * @param   {Object}        id          An object containing the uid of the user, the id of the WebID and it's URI-representations
     * @param   {String}        name        Name of the user
     * @param   {String}        email       EMail of the user
     * @param   {String}        label       Label given by the user for identifying the WebID
     * @param   {Object}        cert        Certificate-object as generated by crypto.createWebIDCertificate()
     */
    this.addId = function addId(id, name, email, label, cert) {
      var _storeLoad = function _storeLoad(success, results) {
        if (!success) {
          console.log('ERROR while adding to store (success, results): ' + success + ', ' + results);
          throw new Error('An internal error occured, please contact the system administrator!');
        }
      };

      ////////////////////// FOAF-profile in per-user named graph
      var jsonld = {
        '@context': {
          'exp': {
            '@id': 'http://www.w3.org/ns/auth/cert#exponent',
            '@type': 'http://www.w3.org/2001/XMLSchema#integer'
          },
          'mod': {
            '@id': 'http://www.w3.org/ns/auth/cert#modulus',
            '@type': 'http://www.w3.org/2001/XMLSchema#hexBinary'
          }
        },

        '@id': id.full,
        '@type': 'http://xmlns.com/foaf/0.1/Person',
        'http://xmlns.com/foaf/0.1/name': name,
        'http://www.w3.org/ns/auth/cert#key': {
          '@type': 'http://www.w3.org/ns/auth/cert#RSAPublicKey',
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#label': label,
          'mod': cert.cert.publicKey.n.toString(16),
          'exp': cert.cert.publicKey.e.toString(),
        }
      };
      this.store.load('application/ld+json', jsonld, id.uri, _storeLoad);

      ////////////////////// User profile in named graph <http://webidp.local/idp>
      jsonld = {
        '@id': 'http://webidp.local/users#' + id.uid,
        '@type': 'http://webidp.local/vocab#User',
        'http://webidp.local/vocab#name': name,
        'http://webidp.local/vocab#email': email,
        'http://webidp.local/vocab#webID': { '@id': 'http://webidp.local/webids/' + id.uid + '#' + id.hash }
      };
      this.store.load('application/ld+json', jsonld, 'http://webidp.local/idp', _storeLoad);

      ////////////////////// Certificate details in named graph <http://webidp.local/idp>
      jsonld = {
        '@context': {
          'serial': {
            '@id': 'http://webidp.local/vocab#serial',
            '@type': 'http://www.w3.org/2001/XMLSchema#hexBinary'
          },
          'base64DER': {
            '@id': 'http://webidp.local/vocab#base64DER',
            '@type': 'http://www.w3.org/2001/XMLSchema#base64Binary'
          }
        },

        '@id': 'http://webidp.local/certs#' + cert.cert.serialNumber,
        '@type': 'http://webidp.local/vocab#Cert',
        'serial': cert.cert.serialNumber,
        'base64DER': cert.base64DER
      };
      this.store.load('application/ld+json', jsonld, 'http://webidp.local/idp', _storeLoad);

      ////////////////////// WebID attributes in named graph <http://webidp.local/idp>
      jsonld = {
        '@context': {
          'startValidity': {
            '@id': 'http://webidp.local/vocab#startValidity',
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
          },
          'endValidity': {
            '@id': 'http://webidp.local/vocab#endValidity',
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
          }
        },

        '@id': 'http://webidp.local/webids/' + id.uid + '#' + id.hash,
        '@type': 'http://webidp.local/vocab#WebID',
        'http://webidp.local/vocab#label': label,
        'http://webidp.local/vocab#profile': { '@id': id.full },
        'http://webidp.local/vocab#active': true,
        'startValidity': cert.cert.validity.notBefore.toISOString(),
        'endValidity': cert.cert.validity.notAfter.toISOString(),
        'http://webidp.local/vocab#cert': { '@id': 'http://webidp.local/certs#' + cert.cert.serialNumber }
      };
      this.store.load('application/ld+json', jsonld, 'http://webidp.local/idp', _storeLoad);
    };

    /**
     * Returns a specified WebID as Turtle.
     *
     * @param   {Object}        id          UID of the WebID
     * @param   {Function}      callback    Called with the Turtle-data
     */
    this.getId = function getId(id, callback) {
      this.store.graph(cfg.getIdUri(id), function(success, results){
        if (success && results) {
          callback(results.toNT());
        } else {
          console.log('ERROR in querying for the WebID (success, results): ' + success + ', ' + results);
          callback('An internal error occured, please contact the system administrator!');
        }
      });
    };

    /**
     * Checks if a given UID already has a WebID with a given label.
     *
     * @param   {Object}        id          UID of the WebID
     * @param   {Object}        label       The label to check for
     * @param   {Function}      callback    Called with true if the label already exists, false otherwise.
     */
    this.hasLabel = function hasLabel(id, label, callback) {
      var sparql = 'SELECT ?label WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <http://webidp.local/users#' + id + '> <http://webidp.local/vocab#webID> ?webid .' +
                   '  ?webid  <http://webidp.local/vocab#label> ?label .' +
                   '} }';
      this.store.execute(sparql, function querySuccess(success, results) {
        if (success && results) {
          var found = false;
          for(var i = 0; i < results.length; i++) {
            if(results[i].label.value.valueOf() === label) {
              found = true;
            }
          }
          callback(found);
        } else {
          console.log('ERROR in querying for label (success, results): ' + success + ', ' + results);
          throw 'An internal error occured, please contact the system administrator!';  // Error gets returned to the client by AJAX, thus not throwing an Error to avoid displaying of stacktrace...
        }
      });
    };

    /**
     * Checks if the given serial has already been assigned to a certificate.
     *
     * @param   {String}        serial      The serial to check
     * @param   {Function}      callback    Called with true if the serial already exists, false otherwise.
     */
    this.serialExists = function serialExists(serial, callback) {
      var sparql = 'SELECT ?serial WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?cert a <http://webidp.local/vocab#Cert> .' +
                   '  ?cert <http://webidp.local/vocab#serial> ?serial .' +
                   '} }';
      this.store.execute(sparql, function querySuccess(success, results) {
        if (success && results) {
          var found = false;
          for(var i = 0; i < results.length; i++) {
            if(results[i].serial.value.valueOf() === serial) {
              found = true;
              console.log('WARNING: Found duplicate serial - strange!');
            }
          }
          callback(found);
        } else {
          console.log('ERROR in querying for serial (success, results): ' + success + ', ' + results);
          throw new Error('An internal error occured, please contact the system administrator!');
        }
      });
    };

    /**
     * Retrieves (internal) information about all WebIDs a user has
     *
     * @param   {String}        uid         The id of the user of which to retrieve the information, or null to retrieve all
     * @param   {Function}      callback    Called with an array of JSON-objects representing the WebIDs.
     */
    this.getWebIDData = function getWebIDData(uid, callback) {
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?webid a <http://webidp.local/vocab#WebID> .' +
                   '  ?webid <http://webidp.local/vocab#label> ?label .' +
                   '  ?webid <http://webidp.local/vocab#profile> ?profile .' +
                   '  ?webid <http://webidp.local/vocab#active> ?active .' +
                   '  ?webid <http://webidp.local/vocab#startValidity> ?startValidity .' +
                   '  ?webid <http://webidp.local/vocab#endValidity> ?endValidity .' +
                   '  ?webid <http://webidp.local/vocab#cert> ?cert .' +
                   '  ?cert <http://webidp.local/vocab#serial> ?serial .' +
                   '} }';
      this.store.execute(sparql, function querySuccess(success, results) {
        if (success && results) {
          var data = [];
          for(var i = 0; i < results.length; i++) {
            data.push({ 'label': results[i].label.value.valueOf(),
                        'profile': results[i].profile.value.valueOf(),
                        'active': results[i].active.value.valueOf() === 'true',
                        'startValidity': new Date(results[i].startValidity.value.valueOf()).toUTCString(),
                        'endValidity': new Date(results[i].endValidity.value.valueOf()).toUTCString(),
                        'certSerial': _formatHex(results[i].serial.value.valueOf().toUpperCase()),
                      });
          }
          callback(data);
        } else {
          console.log('ERROR in querying for serial (success, results): ' + success + ', ' + results);
          throw new Error('An internal error occured, please contact the system administrator!');
        }
      });
    };

    /**
     * Retrieves (internal) information about a user
     *
     * @param   {String}        profileUri  The URI of the WebID used by the user to login
     * @param   {Function}      callback    Called with a JSON-Object containing data about the currently logged in user
     */
    this.getUserData = function getUserData(profileURI, callback) {
      var uid = profileURI.match(/(\/.*)\/(.*)#/)[2];
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <http://webidp.local/users#' + uid + '> <http://webidp.local/vocab#name> ?name .' +
                   '  <http://webidp.local/users#' + uid + '> <http://webidp.local/vocab#email> ?email .' +
                   '} }';
      var _store = this.store;
      _store.execute(sparql, function querySuccess(success, results) {
        if (success && results) {
          var userData = { 'uid': uid,
                     'name': results[0].name.value.valueOf(),
                     'email': results[0].email.value.valueOf() };

          sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?webid <http://webidp.local/vocab#profile> <' + profileURI + '> .' +
                   '  ?webid <http://webidp.local/vocab#label> ?label .' +
                   '} }';
          _store.execute(sparql, function querySuccess(success, results) {
            if (success && results) {
              userData.profile = profileURI;
              userData.label = results[0].label.value.valueOf();
              callback(userData);
            } else {
              console.log('ERROR in querying for user data (success, results): ' + success + ', ' + results);
              throw new Error('An internal error occured, please contact the system administrator!');
            }
          });

        } else {
          console.log('ERROR in querying for user data (success, results): ' + success + ', ' + results);
          throw new Error('An internal error occured, please contact the system administrator!');
        }
      });

    };

    /**
     * Sets up the store in-memory or using a MongoDB - depending on the configuration.
     */
    this.initialiseStore = function _initialiseStore() {
      var _storeReady = function _storeReady(store) {
        instance.store = store;
      };

      if (cfg.get('db:enabled')) {
        rdfstore.create({ persistent:true,
                          engine: 'mongodb',
                          name: cfg.get('db:name'),
                          overwrite: cfg.get('db:overwrite'),
                          mongoDomain: cfg.get('db:server'),
                          mongoPort: cfg.get('db:port') },
                          _storeReady);
      } else {
        rdfstore.create(_storeReady);
      }
    };
  }


///////////////////// returned function

  /**
   * Self-calling constructor creating the instance
   */
  return new function() {

    /**
     * getter on the instance.
     * 
     * @returns   {PrivateConstructor}    The private instance - creating it first if needed.
     */
    this.getInstance = function getInstance() {
      if (instance === null) {
        instance = new PrivateConstructor();
        instance.constructor = null;
        instance.initialiseStore();
      }
      return instance;
    };

  }
})();
