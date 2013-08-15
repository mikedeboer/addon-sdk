/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

module.metadata = {
  'stability': 'experimental'
};

let { Ci, Cu } = require('chrome');
let { subprocess } = require('subprocess/index');
let { EventTarget } = require('../event/target');
let { Stream } = require('../io/stream');
let { on, emit, off } = require('../event/core');
let { Class } = require('../core/heritage');
let { platform } = require('../system');
let { isFunction, isArray } = require('../lang/type');
let { delay } = require('../lang/functional');
let { extend } = require('../util/object');
let isWindows = platform.indexOf('win') === 0;

let processes = WeakMap();

/**
 * The `Child` class wraps a subprocess command, exposes
 * the stdio streams, and methods to manipulate the subprocess
 */
let Child = Class({
  implements: [EventTarget],
  initialize: function initialize (options) {
    let child = this;
    let proc;

    // Delay execution so we can bind error handlers
    delay(() => {
      try {
        proc = subprocess.call({
          command: options.file,
          arguments: options.cmdArgs,
          environment: normalizeEnv(options.env),
          workdir: options.cwd,
          charset: options.encoding,
          stdout: data => emit(child.stdout, 'data', data),
          stderr: data => emit(child.stderr, 'data', data),
          done: function (result) {
            // Emit 'close' event with exit code and signal,
            // which is `null`, as it was not a killed process
            emit(child, 'close', result.exitCode, null);
          }
        });
        processes.set(child, proc);
      } catch (e) { handleError(e); }
    });

    function handleError (e) {
      // If error is an nsIObject, make a fresh error object
      // so we're not exposing nsIObjects, and we can modify it
      // with additional process information, like node
      if (e && e.QueryInterface)
        e = new Error(e.message, e.fileName, e.lineNumber);
      emit(child.stderr, 'data', e.toString());
      emit(child, 'error', e);
    }

    this.stdin = Stream();
    this.stdout = Stream();
    this.stderr = Stream();
  },
  kill: function kill (signal) {
    let proc = processes.get(this);
    proc.kill(signal);
    emit(this, 'exit', null, signal);
  },
  send: ()=>{},
});

function spawn (file, ...args) {
  let cmdArgs = [];
  // Default options
  let options = {
    cwd: null,
    env: null,
    encoding: 'UTF-8'
  };

  if (args[1]) {
    options = extend(options, args[1]);
    cmdArgs = args[0];
  }
  else {
    if (isArray(args[0]))
      cmdArgs = args[0];
    else
      options = extend(options, args[0]);
  }

  options.file = file;
  options.cmdArgs = cmdArgs;

  return Child(options);
}

exports.spawn = spawn;

/**
 * exec(command, options, callback)
 */
function exec (cmd, ...args) {
  let file, cmdArgs, callback, options = {};

  if (isFunction(args[0]))
    callback = args[0];
  else {
    options = extend(options, args[0]);
    callback = args[1];
  }

  if (isWindows) {
    file = 'cmd.exe';
    cmdArgs = ['/s', '/c', '"' + cmd + '"'];
  }
  else {
    file = '/bin/sh';
    cmdArgs = ['-c', cmd];
  }

  // Undocumented option from node being able to specify shell
  if (options && options.shell)
    file = options.shell;

  execFile(file, cmdArgs, options, callback);
};
exports.exec = exec;
/**
 * execFile (file, args, options, callback)
 */
function execFile (file, ...args) {
  let cmdArgs = [], callback, options = {};

  if (isFunction(args[args.length - 1]))
    callback = args[args.length - 1];

  if (isArray(args[0])) {
    cmdArgs = args[0];
    options = extend(options, args[1]);
  } else if (!isFunction(args[0]))
    options = extend(options, args[0]);

  let child = spawn(file, cmdArgs, options);
  let stdout = '';
  let stderr = '';
  let error = null;

  on(child.stdout, 'data', pumpStdout);
  on(child.stderr, 'data', pumpStderr);
  on(child, 'close', exitHandler);
  on(child, 'error', errorHandler);

  function exitHandler (code, signal) {
    if (error)
      error = procError(error, { code: code, signal: signal });
    else if (code !== 0 || signal !== null)
      error = procError(new Error('Command failed: ' + stderr), {
        code: code,
        signal: signal
      });

    if (isFunction(callback))
      callback(error, stdout, stderr);

    off(child.stdout, 'data', pumpStdout);
    off(child.stderr, 'data', pumpStderr);
    off(child, 'close', exitHandler);
    off(child, 'error', errorHandler);
  }

  function errorHandler (e) {
    error = e;
//    child.stdout.destroy();
//    child.stderr.destroy();
    exitHandler();
  }

  function kill () {

  }

  function pumpStdout (data) stdout += data;
  function pumpStderr (data) stderr += data;

  return child;
}
exports.execFile = execFile;
exports.fork;

function normalizeEnv (obj = {}) {
  let env = [];
  for (var prop in obj) {
    env.push(prop + '=' + obj[prop]);
  }
  return env;
}

function procError (err, options = {}) {
  // If code and signal look OK, this was probably a failure
  // attempting to spawn the process (like ENOENT in node) -- use
  // the code from the error message
  if (!options.code && !options.signal) {
    let match = err.message.match(/(NS_ERROR_\w*)/);
    if (match && match.length > 1)
      err.code = match[1];
  }
  else 
    err.code = options.code != null ? options.code : null;
  err.killed = options.killed || false;
  err.signal = options.signal || null
  return err;
}
