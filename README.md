WebIDP
======

Identity provider for [WebID](http://www.w3.org/2005/Incubator/webid/spec/).

TODOs
=====

Prio-1
------
* LDAP
* Remove name/label from the profile?
* Licensing
    * <http://www.debian.org/legal/licenses/>
    * <http://dev.perl.org/licenses/>
    * <http://www.digium.com/en/products/asterisk/licensing>
    * <http://www.patentattorneys.ch/jahia/Jahia>
* Deployment
    * <http://supervisord.org/>
    * <https://github.com/dreamerslab/nodejs.production>
    * <http://dailyjs.com/2011/03/07/node-deployment/>
    * <http://yahooeng.tumblr.com/post/68823943185/nodejs-high-availability>

Prio-2
------
* Proper parsing and verification of SPKAC
* Cleanup-process for accounts not existing anymore
* Clear HTML in profile view after the last WebID has been deleted
* Prevent simultaneous changes from the same user logged in multiple times
* Check input validation everywhere

Prio-3
------
* Validate HTML
* Security-"audit" (
    * at least for <https://www.owasp.org/index.php/Category:OWASP_Top_Ten_Project#OWASP_Top_10_for_2013>
* Use SPARQL-ASK for hasLabel(), serialExists()
* Disable RC4 / other ciphers
* PFS
    * <https://tools.ietf.org/html/rfc6460>
    * <http://stackoverflow.com/questions/10185110/key-generation-requirements-for-tls-ecdhe-ecdsa-aes128-gcm-sha256>
    * <http://stackoverflow.com/questions/10201030/using-node-js-tls-passphrase-and-cipher-options-when-creating-a-server-and-clien>
    * <http://www.heise.de/security/artikel/Zukunftssicher-Verschluesseln-mit-Perfect-Forward-Secrecy-1923800.html>

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
