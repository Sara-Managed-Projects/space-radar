// A CloudFront Function for the viewer-request event (runtime cloudfront-js-2.0).
//
// scripts/deploy.sh stores the code and the bundled data at Brotli 11 with `Content-Encoding: br`
// (internal #514), and CloudFront sends a stored encoding to everyone, whatever they asked for. This
// sends a client that did NOT offer Brotli to the gzip 9 copy the same deploy put under /_gz/. Every
// browser that can run the app offers Brotli, so this is for curl, old robots and proxies.
//
// The pattern is scripts/precompress.mjs `precompressed()` written as one expression, because a
// CloudFront Function cannot import; tests/test_precompress.mjs runs every file of site/ through
// both and fails when they disagree. A client that offers neither is sent gzip as well: there is no
// third copy, and such a client cannot run the app either.
//
// The hosting stack (internal repo, infra/hosting/site-stack.yaml) carries a copy of this file as
// the function's code. Change both.
var PRECOMPRESSED = /^\/(?:(?:js|css|vendor)\/.*\.(?:js|css|wasm)|data\/(?!v1\/).*\.(?:bin|json|csv|txt)|models\/.*\.glb)$/;

function handler(event) {
  var request = event.request;
  var accept = request.headers['accept-encoding'] ? request.headers['accept-encoding'].value : '';
  if (/(?:^|[\s,])br(?:\s*;\s*q=(?!0(?:\.0*)?\s*(?:,|$))[^,]*)?\s*(?:,|$)/i.test(accept)) return request;
  if (PRECOMPRESSED.test(request.uri)) request.uri = '/_gz' + request.uri;
  return request;
}
