WebIDP
======
*WebIDP* is an identity provider for generating [WebIDs](http://www.w3.org/2005/Incubator/webid/spec/).
It has been developed by [BFH - Bern University of Applied Sciences](http://www.bfh.ch) as a part of a 
research project called [CV3.0](http://cv3.bfh.ch).

*WebIDP* is a server application written in JavaScript, running in a [node.js](http://nodejs.org)-environment
providing a HTML5-frontend for user interaction. The interface allows the user to generate one or
many WebID(s) after a successful authentication to a directory service (currently only LDAP is supported).

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

*Due to a bug in the [webid](https://www.npmjs.org/package/webid)-module, the module-file gets installed at the wrong 
location! To fix this, change to the `node_modules/webid`-directory and move the file `webid.js` to the `bin`-folder.*

Then, go on with configuration as described in the next section. If you want to generate all needed certificates for
testing with the test-code provided by *WebIDP*, run `node test/crypto.js` - this should generate the certificates 
and place them into the certs-directory.

After configuration, the server can be run by issuing `npm start`.

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
    * **cacheTemplates** Can be true or false; if false, the templates of the server's pages are parsed on every request (used for development)

* **ca** Configuration of the certification authority signing the WebIDs
    * **cert** Certificate used for signing the WebIDs in PEM-format
    * **key** Key belonging to the above certificate

* **db** Configuration of the database
    * **enabled** Can be true or false; enables/disables the use of MongoDB as backend
    * **name** Name of the database within MongoDB
    * **server** Hostname of the MongoDB-server
    * **port** Port of the MongoDB-server
    * **overwrite** Can be true or false; if true, database is overwritten at every start (used for development)

* **webid** Details of the generated WebIDs
    * **subject** Contains key/value pairs to be added to every WebID's subject - see the example configuration file
    * **sha256** Can be true or false; if true, signature of the WebID is done with SHA256 - otherwise with SHA1
    * **fragment** Fragment of the WebID-URI like #profile, #me etc. 
    * **validityStart** Start of validity for the WebID-certificate (defaults to now), see src/config.js for details
    * **validityEnd** End of validity for the WebID-certificate, (defaults to start + one year), see src/config.js for details

* **directory** Configuration of the directory backend used for login
    * **backend** Path to the module providing the backend - typically src/ldap.js
    * **config** Configuration specific to the backend module (see below)

* **administrators** A list of WebID-URIs with administrative permissions

* **debugMode** Enable/disable debug mode, useful for testing

### Configuration for the LDAP-backend
The backend provided with *WebIDP* for using an LDAP-directory as authentication service supports the following options:

* **url** A ldap:// or ldaps://-URL for connecting to the LDAP-server
* **adminDN** Distinguished name of the account used for the connection
* **adminPassword** Password of the above account
* **searchBase** Where in the tree to start the LDAP-search
* **searchFilter** An additional LDAP-filter for searching

Debug Mode
----------
*WebIDP* supports a debug mode which can be useful in development and troubleshooting; it should however never be used in
a "productin" scenario when working with real users or data.

When enabled in the configuration (see above), debug mode changes some of the behavior of *WebIDP*:

* More verbose error messages
* More verbose logging
* Templates are not cached
* Directory browsing is enabled for /static
* A minimalistic SPARQL-console is provided at /sparql

Open Points
-----------
Due to the limited time available in the project, not all features could have been implemented and some issues remain
unresolved. The following list gives an overview of these open points for completeness:

* **Privacy improvements**
    * Reduced profile information (no name/label)
    * Remove UID from WebID-URI
* **Account-cleanup** (Periodically) Remove WebIDs of accounts not existing in the directory anymore
* **Proper SPKAC-validation** Currently, not all relevant aspects of the SPKAC returned by the HTML5-keygen are properly validated
* **Workaround for rdfstore-js delete bug** See [rdfstore-js issue](https://github.com/antoniogarrote/rdfstore-js/issues/63)
* **SSL-hardening** Use perfect forward secrecy on the server's port, disable unsecure ciphers etc.
* **Input validation** Check if input is validated correctly everywhere
* **Concurency** Currently, actions from the same user logged in multiple times aren't handled properly.
* **UI-Improvements** 
    * Display UID-field for admins
    * Sorting/pagination
    * Clear UI after deletion of last WebID
    * Error-display in /create without reload of page
    * Additional content for the profile can be entered by the user (triples)
* **Security audit** Check overall security, OWASP-style
* **CA improvements** Implement OCSP / CRL
* **Multiple backends simulaneously** For instance having an LDAP- as well as a flat-file directory at the same time
* **Prevent log-output from connect-rest**
