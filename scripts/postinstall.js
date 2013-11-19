/**
 * @file Postinstall-script for npm-package-manager
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
 *
 * This script is run by npm after the installation. It is responsible for downloading
 * additional dependencies which are not (or not in a form needed) available as npm-packages.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */
/*global EXTERNAL_FILES:true */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var request = require('request'),
  fs = require('fs');

var EXTERNAL_FILES = [
  ['static/scripts/jquery.js','http://code.jquery.com/jquery-1.9.1.min.js'],
  ['static/scripts/underscore.js', 'http://underscorejs.org/underscore-min.js'],
  ['static/scripts/backbone.js', 'http://backbonejs.org/backbone-min.js']
];


/***********************************************************
 * Function definitions
 **********************************************************/

/**
 * This function gets called when all EXTERNAL_FILES have been fetched.
 * Currently it only informs the user, that the postinstall-script has finished its duty.
 */
var _fetchDone = function _fetchDone () {
  console.log('Done fetching files!');
  console.log('WebIDP postinstall script finished!');
};

/**
 * This function asynchronously fetches all the resources given in the EXTERNAL_FILES-array
 */
var _fetchFiles = function _fetchFiles() {
  console.log('Fetching files...');

  var runningRequests = 0;

  EXTERNAL_FILES.forEach(function _element(file) {
    console.log('Retrieving ' + file[1] + '...');

    var readable = request(file[1]);
    runningRequests++;

    readable.on('end', function _end () {
      runningRequests--;
      if (runningRequests === 0) {
        _fetchDone();
      }
    });

    readable.on('error', function _error (err) {
      console.log('Error occured: ' + err);
      runningRequests--;
      if (runningRequests === 0) {
        _fetchDone();
      }
    });

    readable.pipe(fs.createWriteStream(file[0]));
  });
};


/***********************************************************
 * Main application
 **********************************************************/

console.log('WebIDP postinstall script running...');

_fetchFiles();
