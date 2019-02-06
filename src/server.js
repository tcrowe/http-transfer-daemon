#!/usr/bin/env node

/*

http-copy-daemon

See ../readme.md for how to use it

*/

const fs = require("fs");
const path = require("path");
const getopts = require("getopts");
const random = require("lodash/random");
const isNil = require("lodash/isNil");
const isString = require("lodash/isString");
const isArray = require("lodash/isArray");
const get = require("lodash/get");
const busboy = require("busboy");
const makeDir = require("make-dir");
const randomPort = () => random(2000, 65000);
const opts = getopts(process.argv);
const {
  protocol = "http",
  port = randomPort(),
  host = "127.0.0.1",
  silent = false,
  key,
  cert,
  token,
  verifyfn
} = opts;
const allowedMethod = opts["allowed-method"] || opts.allowedMethod || "PUT";
let server;
const jsonHeader = { "content-type": "application/json" };

/**
 * Generate error JSON response text
 * @method
 * @param {number} code
 * @param {string} message
 * @returns {string}
 */
const errorResponseJson = (code, message) =>
  JSON.stringify({
    ok: false,
    error: true,
    code,
    message
  });

// 405
const methodNotAllowedResponseJson = errorResponseJson(
  405,
  "method not allowed"
);

// 401
const notAuthorizedResponseJson = errorResponseJson(401, "not authorized");

// 500
const serverErrorResponseJson = errorResponseJson(500, "server error");

// 400
const badRequestResponseJson = errorResponseJson(401, "bad request");

// ok
const okResponse = JSON.stringify({ ok: true });

/**
 * Create a logging error handler with section prefix
 * @method errorHandler
 * @param {string} section
 * @returns {function}
 */
function errorHandler(section) {
  return function(err) {
    if (silent === true) {
      return;
    }

    console.error(section, "error", err);
  };
}

/**
 * Handle the requests coming from http or http2
 * @method requestHandler
 * @param {[type]} req
 * @param {[type]} res
 * @returns {[type]}
 */
function requestHandler(req, res) {
  const { method } = req;

  function jsonEnd(code, message) {
    res.writeHead(code, jsonHeader);
    res.end(message);
  }

  const methodNotAllowedError = () =>
    jsonEnd(405, methodNotAllowedResponseJson);

  const notAuthorizedError = () => jsonEnd(401, notAuthorizedResponseJson);

  const serverError = () => jsonEnd(500, serverErrorResponseJson);

  const badRequestError = () => jsonEnd(400, badRequestResponseJson);

  if (isString(allowedMethod) === true && method !== allowedMethod) {
    // wrong method
    return methodNotAllowedError();
  }

  if (isArray(allowedMethod) === true && allowedMethod.indexOf(method) === -1) {
    // wrong method from method list
    return methodNotAllowedError();
  }

  if (isString(token) === true) {
    const reqToken = get(req, "headers.token");
    if (reqToken !== token) {
      // wrong token
      return notAuthorizedError();
    }
  }

  function save() {
    const { headers } = req;
    const frm = new busboy({ headers });
    let destPath;

    frm.on("field", function(fieldname, val) {
      if (fieldname === "destPath") {
        destPath = val;
      }
    });

    frm.on("file", function(fieldname, file) {
      if (isNil(destPath) === true) {
        return badRequestError();
      }

      function receiveFile() {
        const outStream = fs.createWriteStream(destPath);
        file.pipe(outStream);
      }

      const parentPath = path.dirname(destPath);

      fs.exists(parentPath, function(exists) {
        if (exists === true) {
          return receiveFile();
        }

        makeDir(parentPath)
          .then(function() {
            receiveFile();
          })
          .catch(function(err) {
            // const emsg = `error creating parent directory: ${parentPath}`;
            errorHandler("form")(err);
            return badRequestError();
          });
      });
    });

    frm.on("finish", function() {
      res.writeHead(200, jsonHeader);
      res.end(okResponse);
    });

    req.pipe(frm);
  }

  if (isString(verifyfn) === true) {
    require(verifyfn)({ req, res }, function(err, verified = false) {
      if (isNil(err) === false) {
        // verifier didn't work
        errorHandler("verifyfn")(err);
        return serverError();
      }

      if (verified === false) {
        // verifier says no
        return notAuthorizedError();
      }

      // verified, ok
      save();
    });
    return;
  }

  // ok
  save();
}

if (protocol === "http" || protocol === "https") {
  if (
    isString(key) === true &&
    isString(cert) === true &&
    key.length > 0 &&
    cert.length > 0
  ) {
    server = require("https").createServer({ key, cert }, requestHandler);
  } else {
    // http
    server = require("http").createServer(requestHandler);
  }
} else if (protocol === "http2") {
  if (
    isString(key) === true &&
    isString(cert) === true &&
    key.length > 0 &&
    cert.length > 0
  ) {
    // secure http2
    server = require("http2").createSecureServer({ key, cert });
  } else {
    // http2
    server = require("http2").createServer();
  }

  server.on("request", requestHandler);
}

server.on("error", errorHandler("server"));

/**
 * Try to gracefully shutdown the http server so it doesn't stay open
 * @method shutdown
 * @param {object} opts
 * @param {number} [opts.code=0]
 * @param {boolean} [opts.close=true]
 * @param {boolean} [opts.exit=true]
 * @returns {undefined}
 */
function shutdown(opts = {}) {
  const { close = true, exit = true } = opts;
  let { code = 0 } = opts;

  if (close === true) {
    try {
      server.close();
    } catch (err) {
      errorHandler("shutdown")(err);
      code = 1;
    }
  }

  if (exit === true) {
    process.exit(code);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);
process.on("unhandledException", function(err) {
  errorHandler("unhandledException")(err);
  shutdown({ code: 1 });
});

server.listen(port, host, function(err) {
  if (isNil(err) === false) {
    errorHandler("server")(err);
    return shutdown();
  }

  if (silent === false) {
    console.log(`http://${host}:${port}`);
  }
});
server.port = port;
server.host = host;
server.shutdown = shutdown;

module.exports = server;
