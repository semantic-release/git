const {castArray} = require('lodash');
const verifyGit = require('./lib/verify');
const publishGit = require('./lib/publish');

let verified;

async function verifyConditions(pluginConfig, {options, logger}) {
  // If the Git publish plugin is used and has `assets` or `message` configured, validate them now in order to prevent any release if the configuration is wrong
  if (options.publish) {
    const publishPlugin = castArray(options.publish).find(
      config => config.path && config.path === '@semantic-release/git'
    );
    if (publishPlugin && publishPlugin.assets) {
      pluginConfig.assets = publishPlugin.assets;
    }
    if (publishPlugin && publishPlugin.message) {
      pluginConfig.message = publishPlugin.message;
    }
  }
  await verifyGit(pluginConfig, options, logger);
  verified = true;
}

async function publish(pluginConfig, {options, lastRelease, nextRelease, logger}) {
  if (!verified) {
    await verifyGit(pluginConfig, options, logger);
    verified = true;
  }
  await publishGit(pluginConfig, options, lastRelease, nextRelease, logger);
}

module.exports = {verifyConditions, publish};
