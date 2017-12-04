const semver = require('semver');
const debug = require('debug')('semantic-release:git');
const {unshallow, gitTags} = require('./git');

/**
 * Last release.
 *
 * @typedef {Object} LastRelease
 * @property {string} version The version number of the last release.
 * @property {string} [gitHead] The Git reference used to make the last release.
 */

/**
 * Determine the Git tag and version of the last tagged release.
 *
 * - Unshallow the repository
 * - Obtain all the tags referencing commits in the current branch history
 * - Filter out the ones that are not valid semantic version
 * - Sort the tags
 * - Retrive the highest tag
 *
 * @param {Object} logger Global logger.
 * @return {Promise<LastRelease>} The last tagged release or `undefined` if none is found.
 */
module.exports = async logger => {
  // Unshallow the repo in order to get all the tags
  await unshallow();
  const tags = (await gitTags()).filter(tag => semver.valid(semver.clean(tag))).sort(semver.compare);
  debug('found tags: %o', tags);

  if (tags.length > 0) {
    const tag = tags[tags.length - 1];
    logger.log('Found git tag version %s', tag);
    return {gitHead: tag, version: semver.valid(semver.clean(tag))};
  }

  logger.log('No git tag version found');
};
