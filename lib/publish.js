const resolveConfig = require('./resolve-config');
const {push} = require('./git');

/**
 * Publish a release commit including configurable files.
 *
 * @param {Object} pluginConfig The plugin configuration.
 * @param {String} [pluginConfig.pushStep] Step at which commits are pushed to git.
 * @param {Object} context semantic-release context.
 * @param {Object} context.options `semantic-release` configuration.
 * @param {Object} context.nextRelease The next release.
 * @param {Object} context.logger Global logger.
 */
module.exports = async (pluginConfig, context) => {
  const {
    env,
    cwd,
    options: {branch, repositoryUrl},
    nextRelease,
    logger,
  } = context;
  const {pushStep} = resolveConfig(pluginConfig);
  if (pushStep === 'publish') {
    await push(repositoryUrl, branch, {env, cwd});
    logger.log('Published Git commit for: %s', nextRelease.gitTag);
  }
};
