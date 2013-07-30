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
    this.idUri = 'https://' + cfg.get('server:fqdn') + ':' + cfg.get('server:port') + '/id/';

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

        '@id': this.idUri + id +  '#' + cfg.get('idFragment'),
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

    this.initialiseStore = function _initialiseStore() {
      var _storeReady = function _storeReady(store) {
        instance.store = store;
        instance.addId('test', 'Justus Testus', 'The key label',
                'DDE3B46716DDB181E052BC165E404CDEF62B5CBFC221E364F5422B488D6CFBAD8D3E5B71BDE427C78054FD47F4C1E713877D029DB6A8EE01030260C16454A746567EC4123B1CC2A698F85FC3CAC7599CC7B94DC707B0CCBF58034E74E8623874744DB95F26C4366DB377798FDD9CFA09F7CBE658D11FD58536A544D98362A96DED9A71C461141CE019F27419128D663D35EEB0A0EA883DD81024BE7BD18021BDB232CCAAD11E8D36EEC66AE91283AA25A64C4492FDF7BF812DB19114CDD86CF54AA16EC212188A4780C43363AB20B2D6BE23658EFDA49DFFF96E18622C4D8F8F0E5C6A22619D685227598AE8DADED5585963A3005349160D12BB2E732E7AC468B0FAAEDE21ABDC97884258A363C5E7ED74977F1BBBF40FC29BBED1BAB1BABCD0660E422CFAAB3F37E2FD57E5706CAFF22403B81C8B932EE1B046CDF2C401595136BBD7185BA7A6DBCFB8C37BE0DCB79569856247ACB83DE1405BBA1CE390477463C2F2DECC39AE3663D3DCF80F43C38B7AEA3BCE617625E5A7AE0AC254AAC65A8AF751454260CA80A412AD85B822C2495E2A51A55F34C0086B47670F7216FBF32DDFDC5B43FC0853DE08D3C1EBEA365263F85EB2B61097EE7D3274C3C5B78791D47F8B68D380EA47661CC175D3666AFB0B5D11612F9159B91706C4225CAA606A75A49DC22309EF29DDB831DAB28EC7903CE23626918DD18E8781A731D6FB3649',
                65537);
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
