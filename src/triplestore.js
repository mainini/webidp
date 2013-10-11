/**
 * @file Interface to triplestore for WebIDP 
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

var rdfstore = require('rdfstore'),
  cfg = require('./config.js');


/***********************************************************
 * Definition of the TripleStore-singleton
 **********************************************************/

exports.TripleStore = (function() {
  var instance = null;

///////////////////// 'constructor'

  function PrivateConstructor() {

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

      this.store.load('application/ld+json', jsonld, id.uri, function _storeLoad(success, results) {});
    };

    this.getId = function getId(id, callback) {
      this.store.graph(cfg.getIdUri(id), function(success, graph){
        callback(graph.toNT());
      });
    };

    this.getNextSerialNumber = function getNextSerialNumber() {
      return 3;
    };

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

  return new function() {

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
