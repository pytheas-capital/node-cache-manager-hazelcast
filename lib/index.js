"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _hazelcastClient = require("hazelcast-client");

class HazelcastStore {

  constructor(args = {}) {
    this.name = "hazelcast";
    this.usePromises = true;

    this.args = args;
    this.createClient(args);
    this.prefix = args.prefix;
    this.defaultMap = args.defaultMap || "CACHE";
  }
  createClient(args) {
    const clientConfig = new _hazelcastClient.Config.ClientConfig();
    const networkCfg = new _hazelcastClient.Config.ClientNetworkConfig();
    const address = `${args.host}:${Number.parseInt(args.port, 10)}`;

    clientConfig.groupConfig.name = "cluster";
    clientConfig.networkConfig.addresses.push(address);

    clientConfig.properties["hazelcast.logging"] = "off";
    return _hazelcastClient.Client.newHazelcastClient(clientConfig).then(client => {
      this.client = client;
    });
  }
  mapName(map) {
    return `${this.prefix ? `${this.prefix}_` : ""}${map || this.defaultMap}`;
  }
  map(map) {
    return this.client.getMap(this.mapName(map));
  }
  _tryCatchRestart(fn) {
    return fn().catch(e => {
      if (e.code === "EPIPE") {
        return this.createClient(this.args).then(() => fn());
      }
    });
  }
  setPromise(key, value, options = {}) {
    return this._tryCatchRestart(() => this.map(options.mapName).put(key, value, options.ttl));
  }
  set(key, value, options = {}, cb) {
    options.ttl = options.ttl || this.args.ttl;
    this.setPromise(key, value, options).then(val => cb(undefined, val)).catch(err => cb(err));
  }
  getPromise(key, options = {}) {
    return this._tryCatchRestart(() => this.map(options.mapName).get(key).then(raw => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return raw;
      }
    }));
  }
  get(key, options = {}, cb) {
    this.getPromise(key, options).then(val => cb(undefined, val)).catch(err => cb(err));
  }
  delPromise(key, options = {}) {
    return this._tryCatchRestart(() => this.map(options.mapName).delete(key));
  }
  del(key, options = {}, cb) {
    this.delPromise(key, options).then(val => cb(undefined, val)).catch(err => cb(err));
  }
  resetPromise(options = {}) {
    return this._tryCatchRestart(() => this.map(options.mapName).clear());
  }
  reset(options = {}, cb) {
    this.resetPromise(options).then(val => cb(undefined, val)).catch(err => cb(err));
  }
  keysPromise(options = {}) {
    return this._tryCatchRestart(() => this.map(options.mapName).keySet());
  }
  keys(options = {}, cb) {
    this.keysPromise(options).then(val => cb(undefined, val)).catch(err => cb(err));
  }
}

exports.default = {
  create(args) {
    return new HazelcastStore(args);
  }
};
module.exports = exports.default;