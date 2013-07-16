OpenSSL ca mini-howto
=====================

* Generate ca-cert

 openssl req -new -batch -x509 -keyout private/cakey.pem -extensions req_ext -out cacert.pem -days 365 -config config/ca-certificate.conf

* Generate WebID-request

 openssl req -new -batch -config conf/webid.conf -out webid.pem -keyout webid.pem

* Sign certificate

 openssl ca -config conf/ca.cnf -notext -out certificate.pem.crt -infiles webid.pem
