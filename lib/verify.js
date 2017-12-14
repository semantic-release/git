const {isString, isUndefined, isArray, isPlainObject} = require('lodash');
const SemanticReleaseError = require('@semantic-release/error');
const resolveConfig = require('./resolve-config');
const getAuthUrl = require('./get-auth-url');
const {verifyAuth} = require('./git');

/**
 * Verify the access to the remote Git repository, the commit `message` format and the `assets` option configuration:
 * - The remote repository must be writable.
 * - The commit `message`, is defined, must a non empty `String`.
 * - The `assets` configuration must be an `Array` of `String` (file path) or `false` (to disable).
 *
 * @param {Object} pluginConfig The plugin configuration.
 * @param {String|Array<String|Object>} [pluginConfig.assets] Files to include in the release commit. Can be files path or globs.
 * @param {String} [pluginConfig.message] The commit message for the release.
 * @param {Object} options `semantic-release` configuration.
 * @param {String} options.repositoryUrl The remote git repository URL.
 * @param {String} options.branch The remote branch to publish to.
 * @param {Object} logger Global logger.
 */
module.exports = async (pluginConfig, {repositoryUrl, branch}, logger) => {
  logger.log('Verify authentication for repository %s', repositoryUrl);
  const {message, assets, gitCredentials} = resolveConfig(pluginConfig);

  if (
    !isUndefined(assets) &&
    assets !== false &&
    !(
      isArray(assets) &&
      assets.every(asset => isStringOrStringArray(asset) || (isPlainObject(asset) && isStringOrStringArray(asset.path)))
    )
  ) {
    throw new SemanticReleaseError(
      'The "assets" options must be an Array of Strings or Objects with a path property.',
      'EINVALIDASSETS'
    );
  }

  if (!isUndefined(message) && !(isString(message) && message.trim())) {
    throw new SemanticReleaseError('The "message" options, if defined, must be a non empty String.', 'EINVALIDMESSAGE');
  }

  if (!await verifyAuth(getAuthUrl(gitCredentials, repositoryUrl), branch)) {
    throw new SemanticReleaseError(
      `The git credentials doesn't allow to push on the branch ${branch} of ${repositoryUrl}.`,
      'EGITNOPERMISSION'
    );
  }
};

function isStringOrStringArray(value) {
  return isString(value) || (isArray(value) && value.every(isString));
}
