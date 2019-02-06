
# http-transfer-daemon

It's a quick way to get a file transfer daemon up. You get to decide where the file goes.

Why use it?

+ You don't want to configure FTP, SSH, or some other transfer server.
+ You prefer HTTP, HTTPS, or HTTP2 to transfer files from one place to another.
+ Upload to a VM in development faster than other methods.
+ A quick way to patch or hack some files on another machine.
+ There's a value in parallelization.
+ You want to be able to see how it works in 10min with less than 300 sloc.

## Load the daemon

`npm install -g http-transfer-daemon`

```sh
http-transfer-daemon \
  --protocol http \
  --port 9883 \
  --host 127.0.0.1
```

*⚠️ These options have no security. Read below for security options.*

## Upload a file

There's a form field called `destPath` for destination path. It's an absolute path where the file being uploaded will end up.

One file is attached per request.

`npm install superagent`

```js
const superagent = require("superagent");
const isNil = require("lodash/isNil");

superagent
  .put(`http://127.0.0.1:9883`)
  .accept("json")

  // optional token
  // .set("token", "4nV1dXzdU6HVDuVc")

  // tell the daemon where to put the file
  .field("destPath", path.join("/tmp", "upload.png"))

  // upload the file
  .attach("srcFile", path.join(__dirname, "test", "upload.png"))

  // did it work?
  .end(function(err, res) {
    if (isNil(err) === false) {
      return console.error("error uploading file", err);
    }

    console.log("uploaded 👍🏻");
  });
```

## CLI options

+ [protocol](#protocol) `--protocol http` http, https, http2
+ [port](#port) `--port 9883`
+ [host](#host) `--host 127.0.0.1` Use 0.0.0.0 for all interfaces
+ [silent](#silent) `--silent` Don't log anything
+ [key](#key) `--key /path/to/key.pem` SSL key
+ [cert](#cert) `--cert /path/to/cert.pem` SSL cert
+ [allowed-method](#allowed-method) `--allowed-method PUT`
+ [token](#token) `--token=4nV1dXzdU6HVDuVc` Basic security function
+ [verifyfn](#verifyfn) `--verifyfn /path/to/verify-function.js` Advanced security function

### protocol

+ `http`
+ `https`
+ `http2`

default: `http`

[HTTPS and HTTP2 need testing.](https://github.com/tcrowe/http-transfer-daemon/issues)

### port

default: randomized int 2000-65000

I know using a randomized port is not really useful. It's likely that you will need to supply one yourself.

### host

default: `127.0.0.1`

Use `0.0.0.0` for all interfaces

### silent

⚠️ If silent it wont even log error messages.

default: `false`

`--silent`

### key

SSL private key

`--key /home/buster/key.pem`

### cert

SSL certificate

`--cert /home/buster/cert.pem`

### allowedMethod

 default: PUT

 `--allowed-method=POST`

### token

Optionally check a header token on request as a basic security precaution.

`--token=4nV1dXzdU6HVDuVc`

### verifyfn

Optionally supply an absolute path to a js file that has an async function to verify requests.

`~/basic-verify.js`

```js
function verifyfn({req, res}, done) {
  // done(null, true); // verified 👍🏻
  // done(new Error("problem verifying"))
  done(null, false); // not verified 👎🏻
}

module.exports = verifyfn;
```

`--verifyfn=/home/buster/basic-verify.js`

## Copying, license, and contributing

Copyright (C) Tony Crowe <github@tonycrowe.com> (https://tcrowe.github.io) 2018

Thank you for using and contributing to make http-transfer-daemon better.

⚠️ Please run `npm run prd` before submitting a patch.

⚖️ http-transfer-daemon is Free Software protected by the GPL 3.0 license. See [./COPYING](./COPYING) for more information. (free as in freedom)
