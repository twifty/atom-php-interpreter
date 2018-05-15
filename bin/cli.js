#!/usr/bin/env node

/* global module require */

require('@babel/register')({
    presets: ["@babel/preset-env"]
  // ignore: /node_modules\/(?!my-tool)/
});

module.exports = require('./app');
