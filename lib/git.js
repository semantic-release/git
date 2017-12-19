const execa = require('execa');
const SemanticReleaseError = require('@semantic-release/error');
const debug = require('debug')('semantic-release:git');

/**
 * @return {Array<String>} List of git tags.
 * @throws {Error} If the `git` command fails.
 */
async function gitTags() {
  try {
    return (await execa.stdout('git', ['tag']))
      .split('\n')
      .map(tag => tag.trim())
      .filter(tag => Boolean(tag));
  } catch (err) {
    debug(err);
    throw new Error(err.stderr);
  }
}

/**
 * Verify if the `ref` is in the direct history of the current branch.
 *
 * @param {string} ref The reference to look for.
 *
 * @return {boolean} `true` if the reference is in the history of the current branch, `false` otherwise.
 */
async function isRefInHistory(ref) {
  return (await execa('git', ['merge-base', '--is-ancestor', ref, 'HEAD'], {reject: false})).code === 0;
}

/**
 * Unshallow the git repository (retriving every commits and tags).
 */
async function unshallow() {
  await execa('git', ['fetch', '--unshallow', '--tags'], {reject: false});
}

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
 * Set Git configuration.
 *
 * @param {String} name Config name.
 * @param {String} value Config value.
 */
async function config(name, value) {
  await execa('git', ['config', name, value]);
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
 * Tag the commit head on the local repository.
 *
 * @param {String} tagName The name of the tag.
 * @throws {Error} if the tag creation failed.
 */
async function tag(tagName) {
  await execa('git', ['tag', tagName]);
}

/**
 * Push to the remote repository.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The branch to push.
 * @throws {Error} if the push failed.
 */
async function push(origin, branch) {
  // Do not log result or error to not reveal credentials
  try {
    await execa('git', ['push', '--tags', origin, `HEAD:${branch}`]);
  } catch (err) {
    throw new Error(`An error occured during the git push to the remote branch ${branch}`);
  }
}

/**
 * @return {String} The sha of the head commit on the local repository
 */
async function gitHead() {
  try {
    return await execa.stdout('git', ['rev-parse', 'HEAD']);
  } catch (err) {
    debug(err);
    throw new Error(err.stderr);
  }
}

/**
 * Verify the write access authorization to remote repository with push dry-run.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The repositoru branch for which to verify write access.
 *
 * @return {Boolean} `true` is authorized to push, `false` otherwise.
 */
async function verifyAuth(origin, branch) {
  // Do not log result or error to not reveal credentials
  return (await execa('git', ['push', '--dry-run', origin, `HEAD:${branch}`], {reject: false})).code === 0;
}

/**
 * Delete a tag locally and remotely, only if reference the local head commit.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} tagName The tag name to delete.
 * @throws {SemanticReleaseError} if the remote tag exists and references a commit that is not the local head commit.
 */
async function deleteHeadTag(origin, tagName) {
  const {stdout: localHeadTag} = await execa('git', ['describe', '--tags', '--exact-match', 'HEAD'], {
    reject: false,
  });
  if (tagName === localHeadTag) {
    debug('tag %s already exists in the local repo', tagName);
    // Delete the local tag
    const shell = await execa('git', ['tag', '-d', tagName], {reject: false});
    debug('delete local tag', shell);
  }

  let {stdout: remoteHeadWithTag} = await execa('git', ['ls-remote', '--tags', origin, tagName], {reject: false});
  if (remoteHeadWithTag) {
    [, remoteHeadWithTag] = remoteHeadWithTag.match(/^(\S+)/);
    debug('remote head with tag %s : %s', tagName, remoteHeadWithTag);
    const localHead = await gitHead();
    debug('local gitHead: %s', localHead);
    if (remoteHeadWithTag !== localHead) {
      throw new SemanticReleaseError(
        `The tag ${tagName} already exists in the remote repository and it refers to the commit ${remoteHeadWithTag} which is not the HEAD of the branch.`,
        'EGITTAGEXIST'
      );
    }
    debug('tag %s already exists in the remote repo', tagName);
    // Delete the tag remotely
    const shell = await execa('git', ['push', '-d', origin, tagName], {reject: false});
    debug('delete remote tag', shell);
  }
}

module.exports = {
  unshallow,
  gitTags,
  verifyAuth,
  getModifiedFiles,
  add,
  config,
  gitHead,
  deleteHeadTag,
  commit,
  tag,
  push,
  isRefInHistory,
};
