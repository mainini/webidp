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
     * @param   {Object}        id          An object containing the id of the WebID and it's URI-representations
     * @param   {String}        name        Name of the user
     * @param   {String}        label       Label given by the user for identifying the WebID
     * @param   {String}        modulus     Modulus of the user's public key
     * @param   {String}        exponent    Exponent of the user's public key
     */
    this.addId = function addId(id, name, label, modulus, exponent) {
      var jsonld = {
        '@context': {
          'cert': 'http://www.w3.org/ns/auth/cert#',
          'xsd': 'http://www.w3.org/2001/XMLSchema#',
          'foaf': 'http://xmlns.com/foaf/0.1/',
          'rdfs': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          'exp': {
            '@id': 'http://www.w3.org/ns/auth/cert#exponent',
            '@type': 'xsd:integer'
          },
          'mod': {
            '@id': 'http://www.w3.org/ns/auth/cert#modulus',
            '@type': 'xsd:hexBinary'
          }
        },

        '@id': id.full,
        '@type': 'foaf:Person',
        'foaf:name': name,
        'cert:key': {
          '@type': 'cert:RSAPublicKey',
          'rdfs:label':  label,
          'exp': exponent,
          'mod': modulus
        }
      };

      this.store.load('application/ld+json', jsonld, id.uri, function _storeLoad() {});
    };

    /**
     * Returns a specified WebID as Turtle.
     *
     * @param   {Object}        id          UID of the WebID
     * @param   {Function}      callback    Called with the Turtle-data
     */
    this.getId = function getId(id, callback) {
      this.store.graph(cfg.getIdUri(id), function(success, graph){
        callback(graph.toNT());
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
      var sparql = 'SELECT ?o WHERE { GRAPH <'  + cfg.getIdUri(id) + '> { ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#label> ?o } }';
      this.store.execute(sparql, function querySuccess(success, results) {
        var found = false;
        for(var i = 0; i < results.length; i++) {
          if(results[i].o.value.valueOf() === label) {
            found = true;
          }
        }
        callback(found);
      });
    };

    /**
     * Checks if the given serial has already been assigned to a certificate.
     *
     * @param   {String}        serial      The serial to check
     * @param   {Function}      callback    Called with true if the label already exists, false otherwise.
     */
    this.serialExists = function serialExists(serial, callback) {
      callback(false);
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
