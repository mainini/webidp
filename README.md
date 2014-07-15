WebIDP
======

*WebIDP* is an identity provider for generating [WebIDs](http://www.w3.org/2005/Incubator/webid/spec/).
It has been developed by [BFH - Bern University of Applied Sciences](http://www.bfh.ch) as a part of a 
research project called [CV3.0](http://cv3.bfh.ch).

*WebIDP* is a server application written in JavaScript, running in a [node.js](http://nodejs.org)-environment
providing a HTML5-frontend for user interaction. The interface allows the user to generate one or
many WebID(s) after a successful login to a directory service (currently only LDAP is supported).

After generation of a WebID, the user can then use this WebID to log in at WebID-enabled services or to the 
*WebIDP* itself in order to manage all of his WebIDs. One or many WebIDs can be specified as administrator-WebIDs,
enabling their users to manage all WebIDs of the server.

More information can also be found on the [project page](http://webidp.bfh.ch).

Installation
------------

Installation of the *WebIDP* code should be straightforward and simple...

First, ensure that you have a running version of [node.js](http://nodejs.org) (*WebIDP* has been developed with
version 10.13) as well as of [npm](http://www.npmjs.org).

As a next step, clone this repository to a place of your choice and run `npm install` at the top of it. This should
install all dependencies.

Then, go on with configuration as described in the next section. If you want to generate all needed certificates for
testing with the test-code provided by *WebIDP*, run `node test/crypto.js` - this should generate the certificates 
and place them into the certs-directory.

### Database

*WebIDP* can be run with or without a database storing the details about users and WebIDs. If run without, all
data is lost after the server terminates.

If you want to run *WebIDP* with a database, [MongoDB](http://www.mongodb.org) needs to be installed and set up accordingly. 

Configuration
-------------

*WebIDP* is configured using the configuration file config.json in the config-directory. The file has to be in 
JSON syntax, a minimal example is provided. Additionally, the following options can be specified:

* **server** Configuration for the server itself
    * **fqdn** The fully qualified domain name of the host running the server
    * **port** The port on which the server should listen
    * **cert** Certificate used by the server for HTTPS-requests in PEM-format
    * **key** Key belonging to the above certificate
    * **logformat** Format for the log messages, see [connect logger](http://www.senchalabs.org/connect/logger.html) for details
    * **cacheTemplates** Can be true or false. If false, the templates of the server's pages are parsed on every request (used for development)

* **ca** Configuration of the certification authority signing the WebIDs
    * **cert** Certificate used for signing the WebIDs in PEM-format
    * **key** Key belonging to the above certificate

* **db** Configuration of the database
    * **enabled** Can be true or false - enables/disables the use of MongoDB as backend
    * **name** Name of the database within MongoDB
    * **server** Hostname of the MongoDB-server
    * **port** Port of the MongoDB-server
    * **overwrite** Can be true or false. If true, database is overwritten at every start (used for development)

* **webid** Details of the generated WebIDs
    * **subject** Contains key/value pairs to be added to every WebID's subject - see the example configuration file
    * **sha256** Can be true or false. If true, signature of the WebID is done with SHA256 - otherwise with SHA1
    * **fragment** Fragment of the WebID-URI like #profile, #me etc. 
    * **validityStart** Start of validity for the WebID-certificate (defaults to now), see src/config.js for details
    * **validityEnd** End of validity for the WebID-certificate, (defaults to start + one year), see src/config.js for details

* **directory** Configuration of the directory backend used for login
    * **backend** Path to the module providing the backend - typically src/ldap.js
    * **config** Configuration specific to the backend module (see below)

* **administrators** A list of WebID-URIs with administrative permissions

* **debugMode** Enable/disable debug mode, useful for testing

### Configuration for the LDAP-backend

* **url**
* **adminDN**
* **adminPassword**
* **searchBase**
* **searchFilter**

Debug Mode
----------

Open Points
-----------
### Prio-1
* TLS-Renegotiation (Frage Gere) (see also bergi's express-webid...)
* Make name/label in profile optional
* Disable logging from connect-rest
* Cleanup-process for accounts not existing anymore
* rdfstore-delete-bug
* connect-webid-bug in installer (magnetik should redeploy to npm...)
** eventually use <https://npmjs.org/package/express-webid> ? 
* CORS?
* Disable RC4 / other ciphers
* PFS
    * <https://tools.ietf.org/html/rfc6460>
    * <http://stackoverflow.com/questions/10185110/key-generation-requirements-for-tls-ecdhe-ecdsa-aes128-gcm-sha256>
    * <http://stackoverflow.com/questions/10201030/using-node-js-tls-passphrase-and-cipher-options-when-creating-a-server-and-clien>
    * <http://www.heise.de/security/artikel/Zukunftssicher-Verschluesseln-mit-Perfect-Forward-Secrecy-1923800.html>
* Deployment
    * <http://supervisord.org/>
    * <https://github.com/dreamerslab/nodejs.production>
    * <http://dailyjs.com/2011/03/07/node-deployment/>
    * <http://yahooeng.tumblr.com/post/68823943185/nodejs-high-availability>
* Licensing
    * <https://stackoverflow.com/questions/40100/apache-license-vs-bsd-vs-mit>
    * <http://www.debian.org/legal/licenses/>
    * <http://dev.perl.org/licenses/>
    * <http://www.digium.com/en/products/asterisk/licensing>
    * <http://www.patentattorneys.ch/jahia/Jahia>

### Prio-2
* Check input validation everywhere
* Validate HTML
* Use iterators
* Use SPARQL-ASK for hasLabel(), serialExists()
* Proper parsing and verification of SPKAC
* Prevent simultaneous changes from the same user logged in multiple times

### Prio-3
* Security-"audit"
    * at least for <https://www.owasp.org/index.php/Category:OWASP_Top_Ten_Project#OWASP_Top_10_for_2013>
* Clear HTML in profile view after the last WebID has been deleted
* Display UID and additional information for admin
* Sorting/pagination
* Anonymize URI? (no UID in URI)
* Eventually make login-errors in /create single-page

### Features
* Proper MIME-handling for errors and /id
* OCSP/CRL
* Play around with automated testing / code coverage
* Support for multiple user-directories or flat files 
  (for genereting pseudonymous/company-based WebIDs)
  or: let the user enter the data?
* Anonymity through changing/temporary profile URIs?
* Let the user specify additional content for his profile(s)?
* Reusability
    * Is it a proper LDP? Does ist have to be?
    * How RESTful are the interfaces?
