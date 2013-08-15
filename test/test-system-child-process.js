/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { spawn, exec, execFile } = require('sdk/system/child-process');
const { env } = require('sdk/system');
const SDK_ROOT = env.CUDDLEFISH_ROOT;

exports['test `exec` callback success'] = function (assert, done) {
  exec('ls -al', { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.pass(!err, 'no errors found');
    assert.equal(stderr, '', 'stderr is empty');
    assert.pass(/LICENSE/.test(stdout), 'stdout output of `ls -al` finds files');
    assert.pass(/README/.test(stdout), 'stdout output of `ls -al` finds files');
    assert.pass(/d(r[-|w][-|x]){3}/.test(stdout),
      'passing arguments in `exec` works');
    done();
  });
};

exports['test `exec` callback error'] = function (assert, done) {
  exec('not-real-command', { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.pass(err instanceof Error, 'error passed in is an Error instance');
    assert.pass(err.code && err.code !== 0, 'error code property on error');
    assert.equal(err.signal, null,
      'null signal property when not manually terminated');
    assert.equal(stdout, '', 'stdout is empty');
    assert.pass(/not-real-command/.test(stderr), 'stderr contains error message');
    done();
  });
};
require("test").run(exports);
