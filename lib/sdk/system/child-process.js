/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

module.metadata = {
  'stability': 'experimental'
};

let { Cu } = require('chrome');
let { subprocess } = require('subprocess/index');
let { EventTarget } = require('../event/target');
let { Stream } = require('../io/stream');
let { on, emit, off } = require('../event/core');
let { Class } = require('../core/heritage');
let { platform } = require('../system');
let { isFunction, isArray, isFlat } = require('../lang/type');
let { delay } = require('../lang/functional');
let { extend } = require('../util/object');
let isWindows = platform.indexOf('win') === 0;

let processes = WeakMap();

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
            emit(child, 'close', result);
          }
        });
        processes.set(this, proc);
      } catch (e) {
        emit(this, 'error', e);
      } 
    });

    function handleError (e) {
      console.log('ERROR!', e);
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

  // Support node-style encoding names
  if (options.encoding === 'utf8')
    options.encoding = 'UTF-8';

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
  }
  else if (isFlat(args[0]))
    options = extend(options, args[0]);

  let child = spawn(file, cmdArgs, options);
  let stdout = '';
  let stderr = '';

  on(child.stdout, 'data', pumpStdout);
  on(child.stderr, 'data', pumpStderr);
  on(child, 'close', exitHandler);

  function exitHandler (result) {
    let err = result.exitCode ? new Error(stderr) : null;
    if (err)
      err = procError(err, { code: result.exitCode });
    if (isFunction(callback))
      callback(err, stdout, stderr);

    off(child.stdout, 'data', pumpStdout);
    off(child.stderr, 'data', pumpStderr);
    off(child, 'close', exitHandler);
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

function procError (err, options) {
  err.killed = options.killed || false;
  err.code = options.code != null ? options.code : null;
  err.signal = err.signal || null
  return err;
}
