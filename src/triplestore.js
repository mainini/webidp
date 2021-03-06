/**
 * @file Interface to triplestore for WebIDP 
 * @copyright 2013-2014 BFH - Bern University of Applied Sciences -- {@link http://bfh.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.6
 *
 * This is an abstraction for rdfstore.js, providing access to it through a singleton.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var rdfstore = require('rdfstore'),
  async = require('async'),
  cfg = require('./config.js');


var _formatHex = function _formatHex(hex) {
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
  function _PrivateConstructor() {

    /**
     * Executes a SPARQL-query on the store.
     *
     * @param   {String}        sparqlQuery   The query to execute
     * @returns {String}        Either Turtle-formatted RDF, simple triples or an error message
     */
    this.query = function query(sparqlQuery, callback) {
      var result;
      this.store.execute(sparqlQuery, function _querySuccess(success, results) {
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
        callback(result);
      });
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
        'http://webidp.local/vocab#uid': id.uid,
        'http://webidp.local/vocab#name': name,
        'http://webidp.local/vocab#email': email,
        'http://webidp.local/vocab#webID': { '@id': 'http://webidp.local/webids/' + id.uid + '/' + id.hash }
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

        '@id': 'http://webidp.local/webids/' + id.uid + '/' + id.hash,
        '@type': 'http://webidp.local/vocab#WebID',
        'http://webidp.local/vocab#profile': { '@id': id.full },
        'http://webidp.local/vocab#belongsTo': { '@id': 'http://webidp.local/users#' + id.uid },
        'http://webidp.local/vocab#active': true,
        'http://webidp.local/vocab#cert': { '@id': 'http://webidp.local/certs#' + cert.cert.serialNumber },
        'startValidity': cert.cert.validity.notBefore.toISOString(),
        'endValidity': cert.cert.validity.notAfter.toISOString(),
        'http://webidp.local/vocab#label': label
      };
      this.store.load('application/ld+json', jsonld, 'http://webidp.local/idp', _storeLoad);
    };

    /**
     * Returns a specified WebID as Turtle.
     *
     * @param   {Object}        uid         UID of the WebID
     * @param   {Function}      callback    Called with the Turtle-data
     */
    this.getId = function getId(uid, callback) {
      var profile = cfg.getIdUri() + uid;
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?webid <http://webidp.local/vocab#profile> <' + profile + '#' + cfg.get('webid:fragment') + '> .' +
                   '  ?webid <http://webidp.local/vocab#active> ?active .' +
                   '  } }';
      var _store = this.store;
      _store.execute(sparql, function _querySuccess(success, results) {
        if (success) {
          if (results.length === 0) {
            callback(null, null);
          } else if (results[0].active.value.valueOf() === 'true') {
            _store.graph(profile, function _querySuccess(success, results){
              if (success && results) {
                callback(null, results.toNT());
              } else {
                callback('ERROR while querying for the webid!', { success: success, results: results });
              }
            });
          } else {
            callback(null, null);
          }
        } else {
          callback('ERROR while checking the status of the webid!', { success: success, results: results });
        }
      });
    };

    /**
     * Checks if a given UID already has a WebID with a given label.
     *
     * @param   {Object}        uid         UID of the WebID
     * @param   {Object}        label       The label to check for
     * @param   {Function}      callback    Called with two params: error and result. 
     *                                      error is null if everything went fine and the result of the check is in result (true/false)
     */
    this.hasLabel = function hasLabel(uid, label, callback) {
      var sparql = 'SELECT ?label WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <http://webidp.local/users#' + uid + '> <http://webidp.local/vocab#webID> ?webid .' +
                   '  ?webid  <http://webidp.local/vocab#label> ?label .' +
                   '} }';
      this.store.execute(sparql, function _querySuccess(success, results) {
        if (success && results) {
          var found = false;
          for(var i = 0; i < results.length; i++) {
            if(results[i].label.value.valueOf() === label) {
              found = true;
            }
          }
          callback(null, found);
        } else {
          callback('ERROR while querying for label!', { success: success, results: results });
        }
      });
    };

    /**
     * Checks if the given serial has already been assigned to a certificate.
     *
     * @param   {String}        serial      The serial to check
     * @param   {Function}      callback    Called with two params: error and result. 
     *                                      error is null if everything went fine and the result of the check is in result (true/false)
     */
    this.serialExists = function serialExists(serial, callback) {
      var sparql = 'SELECT ?serial WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?cert a <http://webidp.local/vocab#Cert> .' +
                   '  ?cert <http://webidp.local/vocab#serial> ?serial .' +
                   '} }';
      this.store.execute(sparql, function _querySuccess(success, results) {
        if (success && results) {
          var found = false;
          for(var i = 0; i < results.length; i++) {
            if(results[i].serial.value.valueOf() === serial) {
              found = true;
              console.log('WARNING: Found duplicate serial - strange!');
            }
          }
          callback(null, found);
        } else {
          callback('ERROR while querying for serial!', { success: success, results: results });
        }
      });
    };

    /**
     * Retrieves (internal) information about all WebIDs a user has. Returns the same information for
     * all WebIDs if no user is specified using profileURI
     *
     * @param   {String}        uid         The UID of the user or null to retrieve all WebIDs
     * @param   {Function}      callback    Called with two params: error and result. 
     *                                      error if something bad happened, null otherwise and results containing an array of WebIDs
     */
    this.getWebIds = function getWebIds(uid, callback) {
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?webid a <http://webidp.local/vocab#WebID> .';
      if (uid !== null) {
        sparql +=  '  ?webid <http://webidp.local/vocab#belongsTo> ?user . ' +
                   '  ?user <http://webidp.local/vocab#uid> "' + uid + '" .';
      }
      sparql +=    '  ?webid <http://webidp.local/vocab#label> ?label .' +
                   '  ?webid <http://webidp.local/vocab#profile> ?profile .' +
                   '  ?webid <http://webidp.local/vocab#active> ?active .' +
                   '  ?webid <http://webidp.local/vocab#startValidity> ?startValidity .' +
                   '  ?webid <http://webidp.local/vocab#endValidity> ?endValidity .' +
                   '  ?webid <http://webidp.local/vocab#cert> ?cert .' +
                   '  ?cert <http://webidp.local/vocab#serial> ?serial .' +
                   '} }';
      this.store.execute(sparql, function _querySuccess(success, results) {
        if (success && results) {
          var data = [];
          for(var i = 0; i < results.length; i++) {
            data.push({ 'id': results[i].webid.value.valueOf(),
                        'label': results[i].label.value.valueOf(),
                        'profile': results[i].profile.value.valueOf(),
                        'active': results[i].active.value.valueOf() === 'true',
                        'startValidity': new Date(results[i].startValidity.value.valueOf()).toUTCString(),
                        'endValidity': new Date(results[i].endValidity.value.valueOf()).toUTCString(),
                        'certSerial': _formatHex(results[i].serial.value.valueOf().toUpperCase()),
                      });
          }
          callback(null, data);
        } else {
          callback('ERROR while querying for the webids!', { success: success, results: results });
        }
      });
    };

    /**
     * Updates a given WebID. Currently only changes the active/inactive state.
     *
     * @param   {String}        webid       The WebID to update
     * @param   {Object}        data        JSON-serialized attributes of the WebID
     * @param   {Function}      callback    Called with two params: error and result. 
     *                                      error and result are null/undefined if everything went fine.
     */
    this.updateWebId = function updateWebId(webid, data, callback) {
      var _store = this.store;
      var sparql = 'DELETE DATA { GRAPH <http://webidp.local/idp> { ' +
                   '<' + webid + '> <http://webidp.local/vocab#active> ' + !Boolean(data.active) + ' } }';
      _store.execute(sparql, function _querySuccess(success, results) {
        if (success) {
          // DELETEd old state successfully

          sparql = 'INSERT DATA { GRAPH <http://webidp.local/idp> { ' +
                   '<' + webid + '> <http://webidp.local/vocab#active> ' + Boolean(data.active) + ' } }';
          _store.execute(sparql, function _querySuccess2(success, results) {
            if (success) {
              // INSERTed new state successfully, we're done!

              callback(null);

            } else {
              // INSERT failed, try to recover

              var jsonld = {
                '@id': webid,
                'http://webidp.local/vocab#active': !Boolean(data.active)
              };
              _store.load('application/ld+json', jsonld, 'http://webidp.local/idp', function _loadSuccess(success, results) {
                if (!success) {
                  // we only log this error as the callback has already returned and no new information
                  // would be given to the caller. Otherwise we would also have to implement it using async.waterfall...
                  console.log('ERROR encountered additionally while trying to recover state! (success, error): ' + success + ', ' + results);
                }
              });
              callback('ERROR while INSERTing state!', { success: success, results: results });
            }
          });

        } else {
          // DELETE failed

          callback('ERROR while DELETEing state!', { success: success, results: results });
        }
      });
    };

    /**
     * Deletes a given WebID.
     *
     * @param   {String}        webid       The WebID to delete
     * @param   {Function}      callback    Called on successful modification
     */
    this.deleteWebId = function deleteWebId(webid, callback) {
      var _store = this.store;
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <' + webid + '> <http://webidp.local/vocab#profile> ?profile .' +
                   '  <' + webid + '> <http://webidp.local/vocab#cert> ?cert .' +
                   '} }';

      async.waterfall([
        function _gatherData(cb) {
          _store.execute(sparql, function gatherCB(success, results) {
            if (success) {
              cb(null, results);
            } else {
              cb('ERROR while gathering data!', { success: success, results: results });
            }
          });
        },
        function _dropProfile(data, cb) {
          if (data.length === 0) {
            cb('ERROR: Tried to delete non-existing profile!');
          } else {
            sparql = 'DROP GRAPH <' + data[0].profile.value.valueOf().match(/([^#]*)/)[1] + '>';
            _store.execute(sparql, function dropCB(success, results) {
              if (success) {
                cb(null, data);
              } else {
                cb('ERROR while dropping profile!', { success: success, results: results });
              }
            });
          }
        },
        function _deleteCert(data, cb) {
          sparql = 'DELETE WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <' + data[0].cert.value.valueOf() + '> ?p ?o .' +
                   ' } }';
          _store.execute(sparql, function deleteCertCB(success, results) {
            if (success) {
              cb(null, data);
            } else {
              cb('ERROR while deleting certificate data!', { success: success, results: results });
            }
          });
        },
        function _deleteWebID(data, cb) {
          sparql = 'DELETE WHERE { GRAPH <http://webidp.local/idp> {' +
                   ' <' + webid + '> ?p ?o .' +
                   ' } }';
          _store.execute(sparql, function deleteWebIDCB(success, results) {
            if (success) {
              cb(null, data);
            } else {
              cb('ERROR while deleting WebID data!', { success: success, results: results });
            }
          });
        },
        function _deleteAtUser(data, cb) {
          sparql = 'DELETE WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?user <http://webidp.local/vocab#webID> <' + webid + '> .' +
                   ' } }';
          _store.execute(sparql, function deleteAtUserCB(success, results) {
            if (success) {
              callback(null);
            } else {
              cb('ERROR while deleting WebID-reference at user!', { success: success, results: results });
            }
          });
        }
      ], function _err(err, result) {
        callback(err, result);
      });
    };

    /**
     * Retrieves (internal) information about a user
     *
     * @param   {String}        uid         The UID of the logged-in user
     * @param   {String}        profileURI  The URI of the WebID used by the user to login
     * @param   {Function}      callback    Called with a JSON-Object containing data about the currently logged in user
     */
    this.getUserData = function getUserData(uid, profileURI, callback) {
      var sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  <http://webidp.local/users#' + uid + '> <http://webidp.local/vocab#name> ?name .' +
                   '  <http://webidp.local/users#' + uid + '> <http://webidp.local/vocab#email> ?email .' +
                   '} }';
      var _store = this.store;
      _store.execute(sparql, function _querySuccess(success, results) {
        if (success && results) {
          var userData = { 'uid': uid,
                     'name': results[0].name.value.valueOf(),
                     'email': results[0].email.value.valueOf() };

          sparql = 'SELECT * WHERE { GRAPH <http://webidp.local/idp> {' +
                   '  ?webid <http://webidp.local/vocab#profile> <' + profileURI + '> .' +
                   '  ?webid <http://webidp.local/vocab#label> ?label .' +
                   '} }';
          _store.execute(sparql, function _querySuccess(success, results) {
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
    this._initialiseStore = function _initialiseStore() {
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
        instance = new _PrivateConstructor();
        instance.constructor = null;
        instance._initialiseStore();
      }
      return instance;
    };

  }
})();
