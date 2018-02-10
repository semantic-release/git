const {castArray} = require('lodash');
const verifyGit = require('./lib/verify');
const publishGit = require('./lib/publish');

let verified;

async function verifyConditions(pluginConfig, context) {
  const {options} = context;
  // If the Git publish plugin is used and has `assets` or `message` configured, validate them now in order to prevent any release if the configuration is wrong
  if (options.publish) {
    const publishPlugin =
      castArray(options.publish).find(config => config.path && config.path === '@semantic-release/git') || {};

    pluginConfig.assets = pluginConfig.assets || publishPlugin.assets;
    pluginConfig.message = pluginConfig.message || publishPlugin.message;
  }
  await verifyGit(pluginConfig);
  verified = true;
}

async function publish(pluginConfig, context) {
  if (!verified) {
    await verifyGit(pluginConfig);
    verified = true;
  }
  await publishGit(pluginConfig, context);
}

module.exports = {verifyConditions, publish};
