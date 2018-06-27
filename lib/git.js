const execa = require('execa');
const debug = require('debug')('semantic-release:git');

/**
 * Retrieve the list of files modified on the local repository.
 *
 * @return {Array<String>} Array of modified files path.
 */
async function getModifiedFiles() {
  return (await execa.stdout('git', ['ls-files', '-m', '-o']))
    .split('\n')
    .map(tag => tag.trim())
    .filter(tag => Boolean(tag));
}

/**
 * Add a list of file to the Git index. `.gitignore` will be ignored.
 *
 * @param {Array<String>} files Array of files path to add to the index,
 */
async function add(files) {
  const shell = await execa('git', ['add', '--force', '--ignore-errors'].concat(files), {reject: false});
  debug('add file to git index', shell);
}

/**
 * Commit to the local repository.
 *
 * @param {String} message Commit message.
 * @throws {Error} if the commit failed.
 */
async function commit(message) {
  await execa('git', ['commit', '-m', message]);
}

/**
 * Push to the remote repository.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The branch to push.
 * @throws {Error} if the push failed.
 */
async function push(origin, branch) {
  await execa('git', ['push', '--tags', origin, `HEAD:${branch}`]);
}

/**
 * @return {String} The sha of the head commit on the local repository
 */
async function gitHead() {
  return execa.stdout('git', ['rev-parse', 'HEAD']);
}

module.exports = {getModifiedFiles, add, gitHead, commit, push};
