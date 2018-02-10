const {isString, isUndefined, isArray, isPlainObject} = require('lodash');
const AggregateError = require('aggregate-error');
const getError = require('./get-error');
const resolveConfig = require('./resolve-config');

/**
 * Verify the commit `message` format and the `assets` option configuration:
 * - The commit `message`, is defined, must a non empty `String`.
 * - The `assets` configuration must be an `Array` of `String` (file path) or `false` (to disable).
 *
 * @param {Object} pluginConfig The plugin configuration.
 * @param {String|Array<String|Object>} [pluginConfig.assets] Files to include in the release commit. Can be files path or globs.
 * @param {String} [pluginConfig.message] The commit message for the release.
 */
module.exports = async pluginConfig => {
  const {message, assets} = resolveConfig(pluginConfig);
  const errors = [];

  if (
    !isUndefined(assets) &&
    assets !== false &&
    !(
      isArray(assets) &&
      assets.every(asset => isStringOrStringArray(asset) || (isPlainObject(asset) && isStringOrStringArray(asset.path)))
    )
  ) {
    errors.push(getError('EINVALIDASSETS', {assets}));
  }

  if (!isUndefined(message) && !(isString(message) && message.trim())) {
    errors.push(getError('EINVALIDMESSAGE', {message}));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};

function isStringOrStringArray(value) {
  return isString(value) || (isArray(value) && value.every(isString));
}
