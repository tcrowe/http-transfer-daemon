const assert = require("assert");
const fs = require("fs");
const path = require("path");
const isNil = require("lodash/isNil");
const superagent = require("superagent");
const uploadPngPath = path.join(__dirname, "upload.png");
const mochaOptsPath = path.join(__dirname, "mocha.opts");
const tmpPath = path.join(__dirname, "..", ".tmp");
const tmpUploadPngPath = path.join(tmpPath, "upload.png");
const tmpMochaOptsPath = path.join(tmpPath, "mocha.opts");

describe("base-project", function() {
  /*

  protocol = "http",
  port = randomPort(),
  host = "127.0.0.1",
  silent = false,
  key,
  cert,
  allowedMethod = "PUT",
  token,
  verifyfn

  */
  const server = require("../src/server");
  const { host, port } = server;

  it("wrong method", function(done) {
    superagent
      .post(`http://${host}:${port}/`)
      .accept("json")
      .field("destPath", tmpUploadPngPath)
      .attach("srcFile", uploadPngPath)
      .end(function(err, res) {
        // console.log("err", err);
        // console.log("res", res);
        res.statusCode.should.eql(405);
        res.body.error.should.eql(true);
        res.body.code.should.eql(405);
        res.body.message.should.eql("method not allowed");
        done();
      });
  });

  it("upload image", function(done) {
    superagent
      .put(`http://${host}:${port}/`)
      .accept("json")
      .field("destPath", tmpUploadPngPath)
      .attach("srcFile", uploadPngPath)
      .end(function(err, res) {
        assert.equal(isNil(err), true);
        res.body.should.be.an.Object;
        res.body.ok.should.eql(true);
        fs.exists(tmpUploadPngPath, function(exists) {
          exists.should.eql(true);
          done();
        });
      });
  });

  it("upload text", function(done) {
    superagent
      .put(`http://${host}:${port}/`)
      .accept("json")
      .field("destPath", tmpMochaOptsPath)
      .attach("srcFile", mochaOptsPath)
      .end(function(err, res) {
        assert.equal(isNil(err), true);
        res.body.should.be.an.Object;
        res.body.ok.should.eql(true);
        fs.exists(tmpMochaOptsPath, function(exists) {
          exists.should.eql(true);
          done();
        });
      });
  });

  it("shutdown", function() {
    server.shutdown();
  });
});
