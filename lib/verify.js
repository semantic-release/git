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
 * @param {Object} context The context of the semantic release session
 */
module.exports = async (pluginConfig, context) => {
	const {branch, repositoryUrl} = (context && context.options) || {};
	const resolvedConfig = resolveConfig({branch, ...pluginConfig});
	const errors = [];

	if (
		!isUndefined(resolvedConfig.assets) &&
		resolvedConfig.assets !== false &&
		!(
			isArray(resolvedConfig.assets) &&
			resolvedConfig.assets.every(
				asset => isStringOrStringArray(asset) || (isPlainObject(asset) && isStringOrStringArray(asset.path))
			)
		)
	) {
		errors.push(getError('EINVALIDASSETS', resolvedConfig));
	}

	if (isUndefined(resolvedConfig.message) || !(isString(resolvedConfig.message) && resolvedConfig.message.trim())) {
		errors.push(getError('EINVALIDMESSAGE', resolvedConfig));
	}

	await pReduce(resolvedConfig.branchMerges, async (_, branch) => {
		try {
			await verifyRemoteBranch(repositoryUrl, branch);
		} catch (error) {
			//
		}
	});

	if (errors.length > 0) {
		throw new AggregateError(errors);
	}
};

function isStringOrStringArray(value) {
	return isString(value) || (isArray(value) && value.every(isString));
}
