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
 *
 * @todo document functions
 * @todo templated html-output
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var fs = require('fs'),
    rdfstore = require('rdfstore');


/***********************************************************
 * Definition of the TripleStore-singleton
 **********************************************************/

exports.TripleStore = (function() {
  var instance = null;

///////////////////// 'constructor'

  function PrivateConstructor(cfg) {
    this.cfg = cfg;
    this.idUri = 'https://' + this.cfg.get('server:fqdn') + ':' + this.cfg.get('server:port') + '/id/';

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

        '@id': this.idUri + id +  '#' + this.cfg.get('idFragment'),
        '@type': 'foaf:Person',
        'foaf:name': name,
        'cert:key': {
          '@type': 'cert:RSAPublicKey',
          'rdfs:label':  label,
          'exp': exponent,
          'mod': modulus
        }
      };

      this.store.load('application/ld+json', jsonld, this.idUri + id, function _storeLoad(success, results) {});
    };

    this.getId = function getId(id, callback) {
      this.store.graph(this.idUri + id, function(success, graph){
        callback(graph.toNT());
      });
    };

    if (this.cfg.get('db:enabled')) {
      rdfstore.create({persistent:true,
                    engine: 'mongodb',
                    name: this.cfg.get('db:name'),
                    overwrite: this.cfg.get('db:overwrite'),
                    mongoDomain: this.cfg.get('db:server'),
                    mongoPort: this.cfg.get('db:port')
                  }, function _gotStore(store) {
                    exports.TripleStore.getInstance().store = store;
                  });
    } else {
      this.store = rdfstore.create();
    }
  }


///////////////////// returned function

  return new function() {
    this.getInstance = function getInstance(cfg) {
      if (instance === null) {
        instance = new PrivateConstructor(cfg);
        instance.constructor = null;
      }
      return instance;
    };
  }
})();
