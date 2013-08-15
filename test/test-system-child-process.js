/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { spawn, exec, execFile } = require('sdk/system/child-process');
const { env, platform } = require('sdk/system');
const { isNumber } = require('sdk/lang/type');
const SDK_ROOT = env.CUDDLEFISH_ROOT;
const isWindows = platform.toLowerCase().indexOf('win') === 0;

exports.testExecCallbackSuccess = function (assert, done) {
  exec('ls -al', { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.ok(!err, 'no errors found');
    assert.equal(stderr, '', 'stderr is empty');
    assert.ok(/LICENSE/.test(stdout), 'stdout output of `ls -al` finds files');
    assert.ok(/README/.test(stdout), 'stdout output of `ls -al` finds files');
    assert.ok(/d(r[-|w][-|x]){3}/.test(stdout),
      'passing arguments in `exec` works');
    done();
  });
};

exports.testExecCallbackError = function (assert, done) {
  exec('not-real-command', { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.ok(err.code && isNumber(err.code), 'non-zero error code property on error');
    assert.equal(err.signal, null,
      'null signal property when not manually terminated');
    assert.equal(stdout, '', 'stdout is empty');
    assert.ok(/not-real-command/.test(stderr), 'stderr contains error message');
    done();
  });
};

exports.testExecOptions = function (assert, done) {
  exec(getScript('check-env'), {
    cwd: SDK_ROOT,
    env: { CHILD_PROCESS_ENV_TEST: 'my-value-test' }
  }, function (err, stdout, stderr) {
    assert.equal(stderr, '', 'stderr is empty');
    assert.ok(!err, 'received `cwd` option');
    assert.ok(/my-value-test/.test(stdout),
      'receives environment option');
    /* TODO TEST OPTIONS: encoding, timeout, maxBuffer, killSignal */
    done();
  });
};

exports.testExecFileCallbackSuccess = function (assert, done) {
  execFile(getScript('args'), ['--myargs', '-j', '-s'], { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.ok(!err, 'no errors found');
    assert.equal(stderr, '', 'stderr is empty');
    assert.equal(stdout, '--myargs -j -s\n', 'passes in correct arguments');
    done();
  });
};

exports.testExecFileCallbackError = function (assert, done) {
  execFile('not-real-command', { cwd: SDK_ROOT }, function (err, stdout, stderr) {
    assert.equal(err.code, 'NS_ERROR_FILE_UNRECOGNIZED_PATH',
      'error code is NS_ERROR message');
    assert.equal(err.signal, null,
      'null signal property when not manually terminated');
    assert.equal(stdout, '', 'stdout is empty');
    assert.ok(/NS_ERROR_FILE_UNRECOGNIZED_PATH/.test(stderr), 'stderr contains error message');
    done();
  });
};

exports.testExecFileOptions = function (assert, done) {
  execFile(getScript('check-env'), {
    cwd: SDK_ROOT,
    env: { CHILD_PROCESS_ENV_TEST: 'my-value-test' }
  }, function (err, stdout, stderr) {
    assert.equal(stderr, '', 'stderr is empty');
    assert.ok(!err, 'received `cwd` option');
    assert.ok(/my-value-test/.test(stdout),
      'receives environment option');
    /* TODO TEST OPTIONS: encoding, timeout, maxBuffer, killSignal */
    done();
  });
};

function getScript (name) {
  let path = SDK_ROOT + '/test/fixtures/child-process/'
  let ext = isWindows ? '.bat' : '.sh'
  return path + name + ext;
}

require("test").run(exports);
