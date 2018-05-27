const {isString, isUndefined, isArray, isPlainObject} = require('lodash');
const AggregateError = require('aggregate-error');
const pReduce = require('p-reduce');
const getError = require('./get-error');
const resolveConfig = require('./resolve-config');
const {verifyRemoteBranch} = require('./git');

/**
 * Verify the commit `message` format and the `assets` option configuration:
 * - The commit `message`, is defined, must a non empty `String`.
 * - The `assets` configuration must be an `Array` of `String` (file path) or `false` (to disable).
 *
 * @param {Object} pluginConfig The plugin configuration.
 * @param {String|Array<String|Object>} [pluginConfig.assets] Files to include in the release commit. Can be files path or globs.
 * @param {String} [pluginConfig.message] The commit message for the release.
 */
module.exports = async (pluginConfig, {options: {branch, repositoryUrl}}) => {
	const config = resolveConfig({branch, ...pluginConfig});
	const errors = [];

	if (
		!isUndefined(config.assets) &&
		config.assets !== false &&
		!(
			isArray(config.assets) &&
			config.assets.every(
				asset => isStringOrStringArray(asset) || (isPlainObject(asset) && isStringOrStringArray(asset.path))
			)
		)
	) {
		errors.push(getError('EINVALIDASSETS', config));
	}

	if (isUndefined(config.message) || !(isString(config.message) && config.message.trim())) {
		errors.push(getError('EINVALIDMESSAGE', config));
	}

	await pReduce(config.branchMerges, async (_, mergeBranch) => {
		try {
			await verifyRemoteBranch(repositoryUrl, mergeBranch);
		} catch (error) {
			errors.push(getError('EINVALIDMERGEBRANCH', mergeBranch));
		}
	});

	if (errors.length > 0) {
		throw new AggregateError(errors);
	}
};

function isStringOrStringArray(value) {
	return isString(value) || (isArray(value) && value.every(isString));
}
