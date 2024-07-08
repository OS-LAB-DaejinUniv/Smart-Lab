const config = require('./config')
const regexps = require('./regexps')
const sqls = require('./sqls')
const SCEvent = require('./SCEvent')
const SCData = require('./SCData')
const SCHisory = require('./SCHistory')
const SCUserPref = require('./SCUserPref')
const Wallpad = require('./Wallpad')
const express = require('express')
const Database = require('better-sqlite3')
const db = new Database(config.dbPath, config.dbConf)
const http = require('http')
const Sound = require('node-aplay')
const { Server } = require('socket.io')
const { SerialPort } = require('serialport')
const { RegexParser } = require('@serialport/parser-regex')

const arduino = new SerialPort(config.arduino);
const wallpad = new Wallpad();

arduino.on('data', data => wallpad.serialEventHandler(data));
