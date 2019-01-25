const {defaultTo, castArray, isNil} = require('lodash');
const verifyGit = require('./lib/verify');
const commitAndPushGit = require('./lib/commit-and-push');

let prepareVerified;
let publishVerified;

function isPrepareConfigured(pluginConfig, context) {
  return (
    !isPublishConfigured(pluginConfig, context) ||
    !isNil(pluginConfig.prepare) ||
    castArray(context.options.prepare).some(config => config && config.path === '@semantic-release/git')
  );
}

function isPublishConfigured(pluginConfig, context) {
  return (
    !isNil(pluginConfig.publish) ||
    castArray(context.options.publish).some(config => config && config.path === '@semantic-release/git')
  );
}

function resolvePluginConfig(step, pluginConfig, context) {
  // If the plugin config is defined under its intended step, prefer that
  if (pluginConfig[step]) {
    pluginConfig = pluginConfig[step];
  }

  // If the Git prepare plugin or publish plugin is used and has `assets` or `message` configured, validate them now in order to prevent any release if the configuration is wrong
  const {options} = context;
  if (options[step]) {
    const stepPlugin =
      castArray(options[step]).find(config => config.path && config.path === '@semantic-release/git') || {};

    pluginConfig.assets = defaultTo(pluginConfig.assets, stepPlugin.assets);
    pluginConfig.message = defaultTo(pluginConfig.message, stepPlugin.message);
  }

  return pluginConfig;
}

function verifyConditions(pluginConfig, context) {
  const prepareConfig = resolvePluginConfig('prepare', pluginConfig, context);
  if (prepareConfig) {
    verifyGit(prepareConfig);
    prepareVerified = true;
  }

  const publishConfig = resolvePluginConfig('publish', pluginConfig, context);
  if (publishConfig) {
    verifyGit(publishConfig);
    publishVerified = true;
  }
}

async function prepare(pluginConfig, context) {
  if (!isPrepareConfigured(pluginConfig, context)) {
    // If a 'publish' config is specifically called out and 'prepare' is not, ignore this step
    return;
  }

  pluginConfig = resolvePluginConfig('prepare', pluginConfig, context);

  if (!prepareVerified) {
    verifyGit(pluginConfig);
    prepareVerified = true;
  }

  await commitAndPushGit(pluginConfig, context);
}

async function publish(pluginConfig, context) {
  if (!isPublishConfigured(pluginConfig, context)) {
    // If a 'publish' config isn't specifically called out, ignore this step
    return;
  }

  pluginConfig = resolvePluginConfig('publish', pluginConfig, context);

  if (!publishVerified) {
    verifyGit(pluginConfig);
    publishVerified = true;
  }

  await commitAndPushGit(pluginConfig, context);
}

module.exports = {verifyConditions, prepare, publish};
