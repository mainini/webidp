#!/bin/sh

# Generate ca-cert
openssl req -new -batch -x509 -keyout private/cakey.pem -extensions req_ext -out cacert.pem -days 365 -config config/ca-certificate.conf

# Generate Server-request
openssl req -new -batch -config config/server.conf -out server-req.pem -keyout server-key.pem

# Generate WebID-request
openssl req -new -batch -config config/webid.conf -out webid-req.pem -keyout webid-key.pem

# Sign certificates
openssl ca -batch -config config/ca.conf -notext -out server-cert.pem -infiles server-req.pem
openssl ca -batch -config config/ca.conf -notext -out webid-cert.pem -infiles webid-req.pem

# Create WebID for broser...
cp webid-cert.pem the-webid.pem
cat webid-key.pem >>the-webid.pem
openssl pkcs12 -export -in the-webid.pem -out the-webid.p12 -name "Justus Testus' WebID"
