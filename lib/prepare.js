const {isPlainObject, isArray, template, castArray, uniq} = require('lodash');
const micromatch = require('micromatch');
const dirGlob = require('dir-glob');
const pReduce = require('p-reduce');
const debug = require('debug')('semantic-release:git');
const resolveConfig = require('./resolve-config');
const {getModifiedFiles, add, commit, push, checkout, merge, pull} = require('./git');

/**
 * Prepare a release commit including configurable files.
 *
 * @param {Object} pluginConfig The plugin configuration.
 * @param {String|Array<String>} [pluginConfig.assets] Files to include in the release commit. Can be files path or globs.
 * @param {String} [pluginConfig.message] The message for the release commit.
 * @param {Object} context semantic-release context.
 * @param {Object} context.options `semantic-release` configuration.
 * @param {Object} context.lastRelease The last release.
 * @param {Object} context.nextRelease The next release.
 * @param {Object} logger Global logger.
 */
module.exports = async (pluginConfig, {options: {branch, repositoryUrl}, lastRelease, nextRelease, logger}) => {
	const config = resolveConfig({branch, ...pluginConfig}, logger);
	const patterns = [];
	const modifiedFiles = await getModifiedFiles();
	const branchRelease = template(config.branchName)({branch, lastRelease, nextRelease});

	patterns.push(
		...config.assets.map(pattern => (!isArray(pattern) && isPlainObject(pattern) ? pattern.path : pattern))
	);

	const filesToCommit = uniq(
		await pReduce(
			patterns,
			async (result, pattern) => {
				const glob = castArray(pattern);
				let nonegate;
				// Skip solo negated pattern (avoid to include every non js file with `!**/*.js`)
				if (glob.length <= 1 && glob[0].startsWith('!')) {
					nonegate = true;
					debug(
						'skipping the negated glob %o as its alone in its group and would retrieve a large amount of files ',
						glob[0]
					);
				}
				result.push(...micromatch(modifiedFiles, await dirGlob(glob), {dot: true, nonegate}));
				return result;
			},
			[]
		)
	);

	logger.log('Creating new release branch %s', branchRelease);
	await checkout(branchRelease, {create: true});

	if (filesToCommit.length > 0) {
		filesToCommit.forEach(file => logger.log('Add %s to the release commit', file));
		logger.log('Found %d file(s) to commit', filesToCommit.length);
		await add(filesToCommit);
		debug('commited files: %o', filesToCommit);
		await commit(template(config.message)({branch, lastRelease, nextRelease}));
	}

	logger.log('Creating tag %s', nextRelease.gitTag);

	if (config.branchPush) {
		logger.log('Pushing release branch %s to remote', branchRelease);
		await push(repositoryUrl, branchRelease);
	}

	for (const branchMerge of config.branchMerges) {
		logger.log('Pulling branch %s', branchMerge);
		await pull(repositoryUrl, branchMerge); // eslint-disable-line no-await-in-loop
		logger.log('Merging release branch %s into %s', branchRelease, branchMerge);
		await merge(branchRelease); // eslint-disable-line no-await-in-loop
		logger.log('Pushing updated branch %s', branchMerge);
		await push(repositoryUrl, branchMerge); // eslint-disable-line no-await-in-loop
		logger.log('Cleaning up for next branch...');
		await checkout(branchRelease); // eslint-disable-line no-await-in-loop
	}

	logger.log('Prepared Git release: %s', nextRelease.gitTag);
};
