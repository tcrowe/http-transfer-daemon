
# http-transfer-daemon

It's a quick way to get a file transfer daemon up.

## Load the daemon

`npm install -g http-transfer-daemon`

```sh
http-transfer-daemon \
  --protocol http \
  --port 9883 \
  --host 127.0.0.1
```

*⚠️ These options have no security. See options below for security options.*

## Upload a file

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

## All options

### protocol

+ http
+ https
+ http2

default: http

### port

default: randomized int 2000-65000

### host

default: 127.0.0.1

### silent

Log any information?

default: false

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

Optionally check a header token on request.

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
