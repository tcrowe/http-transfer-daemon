#!/usr/bin/env node

/*

http-copy-daemon

See ../readme.md for how to use it

*/
"use strict";

var fs = require("fs");

var path = require("path");

var getopts = require("getopts");

var random = require("lodash/random");

var isNil = require("lodash/isNil");

var isString = require("lodash/isString");

var isArray = require("lodash/isArray");

var get = require("lodash/get");

var busboy = require("busboy");

var makeDir = require("make-dir");

var randomPort = function randomPort() {
  return random(2000, 65000);
};

var opts = getopts(process.argv);
var _opts$protocol = opts.protocol,
    protocol = _opts$protocol === void 0 ? "http" : _opts$protocol,
    _opts$port = opts.port,
    port = _opts$port === void 0 ? randomPort() : _opts$port,
    _opts$host = opts.host,
    host = _opts$host === void 0 ? "127.0.0.1" : _opts$host,
    _opts$silent = opts.silent,
    silent = _opts$silent === void 0 ? false : _opts$silent,
    key = opts.key,
    cert = opts.cert,
    token = opts.token,
    verifyfn = opts.verifyfn;
var allowedMethod = opts["allowed-method"] || opts.allowedMethod || "PUT";
var server;
var jsonHeader = {
  "content-type": "application/json"
};
/**
 * Generate error JSON response text
 * @method
 * @param {number} code
 * @param {string} message
 * @returns {string}
 */

var errorResponseJson = function errorResponseJson(code, message) {
  return JSON.stringify({
    ok: false,
    error: true,
    code: code,
    message: message
  });
}; // 405


var methodNotAllowedResponseJson = errorResponseJson(405, "method not allowed"); // 401

var notAuthorizedResponseJson = errorResponseJson(401, "not authorized"); // 500

var serverErrorResponseJson = errorResponseJson(500, "server error"); // 400

var badRequestResponseJson = errorResponseJson(401, "bad request"); // ok

var okResponse = JSON.stringify({
  ok: true
});
/**
 * Create a logging error handler with section prefix
 * @method errorHandler
 * @param {string} section
 * @returns {function}
 */

function errorHandler(section) {
  return function (err) {
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
  var method = req.method;

  function jsonEnd(code, message) {
    res.writeHead(code, jsonHeader);
    res.end(message);
  }

  var methodNotAllowedError = function methodNotAllowedError() {
    return jsonEnd(405, methodNotAllowedResponseJson);
  };

  var notAuthorizedError = function notAuthorizedError() {
    return jsonEnd(401, notAuthorizedResponseJson);
  };

  var serverError = function serverError() {
    return jsonEnd(500, serverErrorResponseJson);
  };

  var badRequestError = function badRequestError() {
    return jsonEnd(400, badRequestResponseJson);
  };

  if (isString(allowedMethod) === true && method !== allowedMethod) {
    // wrong method
    return methodNotAllowedError();
  }

  if (isArray(allowedMethod) === true && allowedMethod.indexOf(method) === -1) {
    // wrong method from method list
    return methodNotAllowedError();
  }

  if (isString(token) === true) {
    var reqToken = get(req, "headers.token");

    if (reqToken !== token) {
      // wrong token
      return notAuthorizedError();
    }
  }

  function save() {
    var headers = req.headers;
    var frm = new busboy({
      headers: headers
    });
    var destPath;
    frm.on("field", function (fieldname, val) {
      if (fieldname === "destPath") {
        destPath = val;
      }
    });
    frm.on("file", function (fieldname, file) {
      if (isNil(destPath) === true) {
        return badRequestError();
      }

      function receiveFile() {
        var outStream = fs.createWriteStream(destPath);
        file.pipe(outStream);
      }

      var parentPath = path.dirname(destPath);
      fs.exists(parentPath, function (exists) {
        if (exists === true) {
          return receiveFile();
        }

        makeDir(parentPath).then(function () {
          receiveFile();
        }).catch(function (err) {
          // const emsg = `error creating parent directory: ${parentPath}`;
          errorHandler("form")(err);
          return badRequestError();
        });
      });
    });
    frm.on("finish", function () {
      res.writeHead(200, jsonHeader);
      res.end(okResponse);
    });
    req.pipe(frm);
  }

  if (isString(verifyfn) === true) {
    require(verifyfn)({
      req: req,
      res: res
    }, function (err) {
      var verified = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (isNil(err) === false) {
        // verifier didn't work
        errorHandler("verifyfn")(err);
        return serverError();
      }

      if (verified === false) {
        // verifier says no
        return notAuthorizedError();
      } // verified, ok


      save();
    });

    return;
  } // ok


  save();
}

if (protocol === "http" || protocol === "https") {
  if (isString(key) === true && isString(cert) === true && key.length > 0 && cert.length > 0) {
    server = require("https").createServer({
      key: key,
      cert: cert
    }, requestHandler);
  } else {
    // http
    server = require("http").createServer(requestHandler);
  }
} else if (protocol === "http2") {
  if (isString(key) === true && isString(cert) === true && key.length > 0 && cert.length > 0) {
    // secure http2
    server = require("http2").createSecureServer({
      key: key,
      cert: cert
    });
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

function shutdown() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _opts$close = opts.close,
      close = _opts$close === void 0 ? true : _opts$close,
      _opts$exit = opts.exit,
      exit = _opts$exit === void 0 ? true : _opts$exit;
  var _opts$code = opts.code,
      code = _opts$code === void 0 ? 0 : _opts$code;

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
process.on("unhandledException", function (err) {
  errorHandler("unhandledException")(err);
  shutdown({
    code: 1
  });
});
server.listen(port, host, function (err) {
  if (isNil(err) === false) {
    errorHandler("server")(err);
    return shutdown();
  }

  if (silent === false) {
    console.log("http://".concat(host, ":").concat(port));
  }
});
server.port = port;
server.host = host;
server.shutdown = shutdown;
module.exports = server;