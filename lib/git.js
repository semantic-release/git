const execa = require('execa');
const debug = require('debug')('semantic-release:git');

/**
 * Retrieve the list of files modified on the local repository.
 *
 * @return {Array<String>} Array of modified files path.
 */
async function getModifiedFiles() {
	return (await execa.stdout('git', ['ls-files', '-m', '-o', '--exclude-standard']))
		.split('\n')
		.map(tag => tag.trim())
		.filter(tag => Boolean(tag));
}

/**
 * Add a list of file to the Git index.
 * If on of the files is present in the .gitignore it will be silently skipped. Other files will still be added.
 *
 * @param {Array<String>} files Array of files path to add to the index,
 */
async function add(files) {
	const shell = await execa('git', ['add', '--ignore-errors'].concat(files), {reject: false});
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

/**
 * Verify if remote branch exists.
 *
 * @param  {string} origin The remote repository URL
 * @param  {string} branch The branch to verify
 * @return {Promise} The response received
 */
async function verifyRemoteBranch(origin, branch) {
	return execa('git', ['ls-remote', '--exit-code', '--heads', origin, branch]);
}

/**
 * Checkout a new or existing branch.
 *
 * @param  {string} branch The name of the branch
 * @param  {boolean} create If the branch should be created
 * @return {Promise} The response received
 */
async function checkout(branch, create) {
	if (create) {
		return execa('git', ['checkout', '-b', branch]);
	}

	return execa('git', ['checkout', branch]);
}

/**
 * Merge any branch into the current branch.
 *
 * @param  {string} branch The branch to merge into the current one
 * @return {Promise} The response received
 */
async function merge(branch) {
	return execa('git', ['merge', '--no-edit', '--commit', branch]);
}

/**
 * Pull a remote branch.
 *
 * @param  {string} origin The repository url
 * @param  {string} branch The branch name
 * @return {Promise} The response received
 */
async function pull(origin, branch) {
	return execa('git', ['pull', origin, branch]);
}

module.exports = {getModifiedFiles, add, gitHead, commit, push, verifyRemoteBranch, checkout, merge, pull};
