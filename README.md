WebIDP
======

Identity provider for [WebID](http://www.w3.org/2005/Incubator/webid/spec/).

TODOs
=====

Prio-1
------
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

Prio-2
------
* Check input validation everywhere
* Validate HTML
* Use iterators
* Use SPARQL-ASK for hasLabel(), serialExists()
* Proper parsing and verification of SPKAC
* Prevent simultaneous changes from the same user logged in multiple times

Prio-3
------
* Security-"audit"
    * at least for <https://www.owasp.org/index.php/Category:OWASP_Top_Ten_Project#OWASP_Top_10_for_2013>
* Clear HTML in profile view after the last WebID has been deleted
* Display UID and additional information for admin
* Sorting/pagination
* Anonymize URI? (no UID in URI)
* Eventually make login-errors in /create single-page

Features
========
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
