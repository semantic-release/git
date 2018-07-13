const path = require('path');
const {pathExists} = require('fs-extra');
const {isUndefined, isPlainObject, isArray, template, castArray, uniq} = require('lodash');
const micromatch = require('micromatch');
const dirGlob = require('dir-glob');
const pReduce = require('p-reduce');
const debug = require('debug')('semantic-release:git');
const resolveConfig = require('./resolve-config');
const {getModifiedFiles, add, commit, push} = require('./git');

const CHANGELOG = 'CHANGELOG.md';
const PACKAGE_JSON = 'package.json';
const PACKAGE_LOCK_JSON = 'package-lock.json';
const SHRINKWRAP_JSON = 'npm-shrinkwrap.json';

// TODO Temporary workaround for https://github.com/kevva/dir-glob/issues/7
const resolvePaths = (files, cwd) =>
  files.map(
    file => `${file.startsWith('!') ? '!' : ''}${path.resolve(cwd, file.startsWith('!') ? file.slice(1) : file)}`
  );

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
module.exports = async (
  pluginConfig,
  {env, cwd, options: {branch, repositoryUrl}, lastRelease, nextRelease, logger}
) => {
  const {message, assets} = resolveConfig(pluginConfig, logger);
  const patterns = [];
  const modifiedFiles = await getModifiedFiles({env, cwd});
  const changelogPath = path.resolve(cwd, CHANGELOG);
  const pkgPath = path.resolve(cwd, PACKAGE_JSON);
  const pkgLockPath = path.resolve(cwd, PACKAGE_LOCK_JSON);
  const shrinkwrapPath = path.resolve(cwd, SHRINKWRAP_JSON);

  if (isUndefined(assets) && (await pathExists(changelogPath))) {
    logger.log('Add %s to the release commit', changelogPath);
    patterns.push(changelogPath);
  }
  if (isUndefined(assets) && (await pathExists(pkgPath))) {
    logger.log('Add %s to the release commit', pkgPath);
    patterns.push(pkgPath);
  }
  if (isUndefined(assets) && (await pathExists(pkgLockPath))) {
    logger.log('Add %s to the release commit', pkgLockPath);
    patterns.push(pkgLockPath);
  }
  if (isUndefined(assets) && (await pathExists(shrinkwrapPath))) {
    logger.log('Add %s to the release commit', shrinkwrapPath);
    patterns.push(shrinkwrapPath);
  }

  patterns.push(
    ...(assets || []).map(pattern => (!isArray(pattern) && isPlainObject(pattern) ? pattern.path : pattern))
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
        result.push(
          ...micromatch(resolvePaths(modifiedFiles, cwd), await dirGlob(resolvePaths(glob, cwd)), {dot: true, nonegate})
        );
        return result;
      },
      []
    )
  );

  if (filesToCommit.length > 0) {
    logger.log('Found %d file(s) to commit', filesToCommit.length);
    await add(filesToCommit, {env, cwd});
    debug('commited files: %o', filesToCommit);
    await commit(
      message
        ? template(message)({branch, lastRelease, nextRelease})
        : `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`,
      {env, cwd}
    );
  }

  logger.log('Creating tag %s', nextRelease.gitTag);
  await push(repositoryUrl, branch, {env, cwd});
  logger.log('Prepared Git release: %s', nextRelease.gitTag);
};
