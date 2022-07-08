const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const execa = require('execa');
const debug = require('debug')('semantic-release:git');

function _generateUniqueFilename() {
  // -> https://stackoverflow.com/questions/23327010/how-to-generate-unique-id-with-node-js
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Retrieve the list of files modified on the local repository.
 *
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Array<String>} Array of modified files path.
 */
async function getModifiedFiles(execaOptions) {
  return (await execa('git', ['ls-files', '-m', '-o'], execaOptions)).stdout
    .split('\n')
    .map(file => file.trim())
    .filter(file => Boolean(file));
}

/**
 * Add a list of file to the Git index. `.gitignore` will be ignored.
 *
 * @param {Array<String>} files Array of files path to add to the index.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 */
async function add(files, execaOptions) {
  const shell = await execa('git', ['add', '--force', '--ignore-errors', ...files], {...execaOptions, reject: false});
  debug('add file to git index', shell);
}

/**
 * Commit to the local repository.
 *
 * @param {String} message Commit message.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the commit failed.
 */
async function commit(message, execaOptions) {
  /* As messages can be arbitrarily long, we have to
   write it to a tempfile to avoid ENAMETOOLONG on
   poor systems not supporting "long" arguments */
  const temporaryDir = os.tmpdir();
  const temporaryMessageFileName = path.resolve(temporaryDir, _generateUniqueFilename());
  fs.writeFileSync(temporaryMessageFileName, message);
  await execa('git', ['commit', '-F', temporaryMessageFileName], execaOptions);
  fs.unlinkSync(temporaryMessageFileName);
}

/**
 * Push to the remote repository.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The branch to push.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the push failed.
 */
async function push(origin, branch, execaOptions) {
  await execa('git', ['push', '--tags', origin, `HEAD:${branch}`], execaOptions);
}

/**
 * Get the HEAD sha.
 *
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {String} The sha of the head commit on the local repository
 */
async function gitHead(execaOptions) {
  return (await execa('git', ['rev-parse', 'HEAD'], execaOptions)).stdout;
}

module.exports = {getModifiedFiles, add, gitHead, commit, push};
