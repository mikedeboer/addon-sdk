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
    assert.ok(/not-real-command/.test(err.toString()),
      'error contains error message');
    assert.ok(err.code && isNumber(err.code), 'non-zero error code property on error');
    assert.equal(err.signal, null,
      'null signal property when not manually terminated');
    assert.equal(stdout, '', 'stdout is empty');
    assert.ok(/not-real-command/.test(stderr), 'stderr contains error message');
    done();
  });
};

exports.testExecOptionsEnvironment = function (assert, done) {
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

exports.testExecOptionsTimeout = function (assert, done) {
  let count = 0;
  let child = exec(getScript('wait'), { timeout: 100 }, (err, stdout, stderr) => {
    assert.equal(err.killed, true, 'error has `killed` property as true');
    assert.equal(err.code, null, 'error has `code` as null');
    assert.equal(err.signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    assert.equal(stdout, '', 'stdout is empty');
    assert.equal(stderr, '', 'stderr is empty');
    if (++count === 3) complete();
  });

  function exitHandler (code, signal) {
    assert.equal(code, null, 'error has `code` as null');
    assert.equal(signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    if (++count === 3) complete();
  }
  
  function closeHandler (code, signal) {
    assert.equal(code, null, 'error has `code` as null');
    assert.equal(signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    if (++count === 3) complete();
  }

  child.on('exit', exitHandler);
  child.on('close', closeHandler);

  function complete () {
    child.off('exit', exitHandler);
    child.off('close', closeHandler);
    done();
  }
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
    assert.ok(/NS_ERROR_FILE_UNRECOGNIZED_PATH/.test(err.toString()),
      'error contains error message');
    assert.equal(err.code, 'NS_ERROR_FILE_UNRECOGNIZED_PATH',
      'error code is NS_ERROR message');
    assert.equal(err.signal, null,
      'null signal property when not manually terminated');
    assert.equal(stdout, '', 'stdout is empty');
    assert.equal(stderr, '', 'stdout is empty');
    done();
  });
};

exports.testExecFileOptionsEnvironment = function (assert, done) {
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

exports.testExecFileOptionsTimeout = function (assert, done) {
  let count = 0;
  let child = execFile(getScript('wait'), { timeout: 100 }, (err, stdout, stderr) => {
    assert.equal(err.killed, true, 'error has `killed` property as true');
    assert.equal(err.code, null, 'error has `code` as null');
    assert.equal(err.signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    assert.equal(stdout, '', 'stdout is empty');
    assert.equal(stderr, '', 'stderr is empty');
    if (++count === 3) complete();
  });

  function exitHandler (code, signal) {
    assert.equal(code, null, 'error has `code` as null');
    assert.equal(signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    if (++count === 3) complete();
  }
  
  function closeHandler (code, signal) {
    assert.equal(code, null, 'error has `code` as null');
    assert.equal(signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    if (++count === 3) complete();
  }

  child.on('exit', exitHandler);
  child.on('close', closeHandler);

  function complete () {
    child.off('exit', exitHandler);
    child.off('close', closeHandler);
    done();
  }
};

/**
 * Not necessary to test for both `exec` and `execFile`, but
 * it is necessary to test both when the buffer is larger
 * and smaller than buffer size used by the subprocess library (1024)
 */
exports.testExecFileOptionsMaxBufferLarge = function (assert, done) {
  let count = 0;
  // Creates a buffer of 2000 to stdout, greater than 1024
  let stdoutChild = execFile(getScript('large-out'), ['2000'], { maxBuffer: 50 }, (err, stdout, stderr) => {
    assert.ok(/stdout maxBuffer exceeded/.test(err.toString()),
      'error contains stdout maxBuffer exceeded message');
    assert.equal(err.killed, true, 'error has `killed` property as true');
    assert.equal(err.code, null, 'error has `code` as null');
    assert.equal(err.signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    assert.ok(stdout.length >= 50, 'stdout has full buffer');
    assert.equal(stderr, '', 'stderr is empty');
    if (++count === 2) complete();
  });

  // Creates a buffer of 2000 to stderr, greater than 1024
  let stderrChild = execFile(getScript('large-err'), ['2000'], { maxBuffer: 50 }, (err, stdout, stderr) => {
    assert.ok(/stderr maxBuffer exceeded/.test(err.toString()),
      'error contains stderr maxBuffer exceeded message');
    assert.equal(err.killed, true, 'error has `killed` property as true');
    assert.equal(err.code, null, 'error has `code` as null');
    assert.equal(err.signal, 'SIGTERM',
      'error has `signal` as SIGTERM by default');
    assert.ok(stderr.length >= 50, 'stderr has full buffer');
    assert.equal(stdout, '', 'stdout is empty');
    if (++count === 2) complete();
  });

  function complete () { done(); }
};

/**
 * When total buffer is < process buffer (1024), the process will exit
 * and not get a chance to be killed for violating the maxBuffer,
 * although the error will still be sent through (node behaviour)
 */
exports.testExecFileOptionsMaxBufferSmall = function (assert, done) {
  let count = 0;
  // Creates a buffer of 100 to stdout, less than 1024
  let stdoutChild = execFile(getScript('large-out'), ['100'], { maxBuffer: 50 }, (err, stdout, stderr) => {
    assert.ok(/stdout maxBuffer exceeded/.test(err.toString()),
      'error contains stdout maxBuffer exceeded message');
    assert.equal(err.killed, false,
      'error has `killed` property as false, as proc ended before being killed');
    assert.equal(err.code, 0, 'error has `code` as 0, as proc finished');
    assert.equal(err.signal, null,
      'error has signal as `null`, as proc finished');
    assert.ok(stdout.length >= 50, 'stdout has full buffer');
    assert.equal(stderr, '', 'stderr is empty');
    if (++count === 2) complete();
  });

  // Creates a buffer of 100 to stderr, less than 1024
  let stderrChild = execFile(getScript('large-err'), ['100'], { maxBuffer: 50 }, (err, stdout, stderr) => {
    assert.ok(/stderr maxBuffer exceeded/.test(err.toString()),
      'error contains stderr maxBuffer exceeded message');
    assert.equal(err.killed, false,
      'error has `killed` property as false, as proc ended before being killed');
    assert.equal(err.code, 0, 'error has `code` as 0, as proc finished');
    assert.equal(err.signal, null,
      'error has signal as `null`, as proc finished');
    assert.ok(stderr.length >= 50, 'stderr has full buffer');
    assert.equal(stdout, '', 'stdout is empty');
    if (++count === 2) complete();
  });

  function complete () { done(); }
};
/*
 * This tests failures when an error is thrown attempting to
 * spawn the process, like an invalid command
 */
exports.testChildEventsSpawningError= function (assert, done) {
  let handlersCalled = 0;
  let child = execFile('i-do-not-exist', (err, stdout, stderr) => {
    assert.ok(err, 'error was passed into callback');
    assert.equal(stdout, '', 'stdout is empty')
    assert.equal(stderr, '', 'stderr is empty');
    if (++handlersCalled === 3) complete();
  });

  child.on('error', handleError);
  child.on('exit', handleExit);
  child.on('close', handleClose);

  function handleError (e) {
    assert.ok(e, 'error passed into error handler');
    if (++handlersCalled === 3) complete();
  }

  function handleClose (code, signal) {
    assert.equal(code, -1,
      'process was never spawned, therefore exit code is -1');
    assert.equal(signal, null, 'signal should be null');
    if (++handlersCalled === 3) complete();
  }

  function handleExit (code, signal) {
    assert.fail('Close event should not be called on init failure');
  }

  function complete () {
    child.off('error', handleError);
    child.off('exit', handleExit);
    child.off('close', handleClose);
    done();
  }
}

function getScript (name) {
  let path = SDK_ROOT + '/test/fixtures/child-process/'
  let ext = isWindows ? '.bat' : '.sh'
  return path + name + ext;
}

require("test").run(exports);
