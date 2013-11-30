WebIDP
======

Identity provider for [WebID](http://www.w3.org/2005/Incubator/webid/spec/).

TODOs / Features
================

* Management-GUI
* LDAP

* Input Validation
* HTML Validation
* Security Audit (https://www.owasp.org/index.php/Category:OWASP_Top_Ten_Project#OWASP_Top_10_for_2013)
* Revoken von WebIDs wenn der LDAP-Account nicht mehr existiert?
* Automated testing / code coverage
* Disable RC4 / other ciphers
* PFS
    * <https://tools.ietf.org/html/rfc6460>
    * <http://stackoverflow.com/questions/10185110/key-generation-requirements-for-tls-ecdhe-ecdsa-aes128-gcm-sha256>
    * <http://stackoverflow.com/questions/10201030/using-node-js-tls-passphrase-and-cipher-options-when-creating-a-server-and-clien>
    * <http://www.heise.de/security/artikel/Zukunftssicher-Verschluesseln-mit-Perfect-Forward-Secrecy-1923800.html>

* Support for multiple user-directories or flat files 
  (for genereting pseudonymous/company-based WebIDs)
  or: let the user enter the data?
* OCSP/CRL
* Automated cleanup of expired webids
* Session-locking
* Label part of WebID?
* Proper MIME-handling for errors and /id
* Is it a proper LDP?
* Anonymity through changing/temporary profile URIs?

* Deployment
    * <http://supervisord.org/>
    * <https://github.com/dreamerslab/nodejs.production>
    * <http://dailyjs.com/2011/03/07/node-deployment/>

* Licensing
    * <http://www.debian.org/legal/licenses/>
    * <http://dev.perl.org/licenses/>
    * <http://www.digium.com/en/products/asterisk/licensing>
    * <http://www.patentattorneys.ch/jahia/Jahia>
