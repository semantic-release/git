import tempy from 'tempy';
import execa from 'execa';
import fileUrl from 'file-url';
import pReduce from 'p-reduce';
import gitLogParser from 'git-log-parser';
import getStream from 'get-stream';

/**
 * Create a temporary git repository.
 * If `withRemote` is `true`, creates a bare repository, initialize it and create a shallow clone. Change the current working directory to the clone root.
 * If `withRemote` is `false`, creates a regular repository and initialize it. Change the current working directory to the repository root.
 *
 * @param {Boolean} withRemote `true` to create a shallow clone of a bare repository.
 * @param {String} [branch='master'] The branch to initialize.
 * @return {String} The path of the clone if `withRemote` is `true`, the path of the repository otherwise.
 */
export async function gitRepo(withRemote, branch = 'master') {
  let cwd = tempy.directory();

  await execa('git', ['init'].concat(withRemote ? ['--bare'] : []), {cwd});

  const repositoryUrl = fileUrl(cwd);
  if (withRemote) {
    await initBareRepo(repositoryUrl, branch);
    cwd = await gitShallowClone(repositoryUrl, branch);
  } else {
    await gitCheckout(branch, true, {cwd});
  }

  await execa('git', ['config', 'commit.gpgsign', false], {cwd});

  return {cwd, repositoryUrl};
}

/**
 * Initialize an existing bare repository:
 * - Clone the repository
 * - Change the current working directory to the clone root
 * - Create a default branch
 * - Create an initial commits
 * - Push to origin
 *
 * @param {String} repositoryUrl The URL of the bare repository.
 * @param {String} [branch='master'] the branch to initialize.
 */
export async function initBareRepo(repositoryUrl, branch = 'master') {
  const cwd = tempy.directory();
  await execa('git', ['clone', '--no-hardlinks', repositoryUrl, cwd], {cwd});
  await gitCheckout(branch, true, {cwd});
  await gitCommits(['Initial commit'], {cwd});
  await execa('git', ['push', repositoryUrl, branch], {cwd});
}

/**
 * Create commits on the current git repository.
 *
 * @param {Array<string>} messages Commit messages.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @returns {Array<Commit>} The created commits, in reverse order (to match `git log` order).
 */
export async function gitCommits(messages, execaOpts) {
  await pReduce(messages, async (_, message) =>
    execa.stdout('git', ['commit', '-m', message, '--allow-empty', '--no-gpg-sign'], execaOpts)
  );
  return (await gitGetCommits(undefined, execaOpts)).slice(0, messages.length);
}

/**
 * Get the list of parsed commits since a git reference.
 *
 * @param {String} [from] Git reference from which to seach commits.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Array<Object>} The list of parsed commits.
 */
export async function gitGetCommits(from, execaOpts) {
  Object.assign(gitLogParser.fields, {hash: 'H', message: 'B', gitTags: 'd', committerDate: {key: 'ci', type: Date}});
  return (await getStream.array(
    gitLogParser.parse({_: `${from ? from + '..' : ''}HEAD`}, {...execaOpts, env: {...process.env, ...execaOpts.env}})
  )).map(commit => {
    commit.message = commit.message.trim();
    commit.gitTags = commit.gitTags.trim();
    return commit;
  });
}

/**
 * Checkout a branch on the current git repository.
 *
 * @param {String} branch Branch name.
 * @param {Boolean} create `true` to create the branch, `false` to checkout an existing branch.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 */
export async function gitCheckout(branch, create = true, execaOpts) {
  await execa('git', create ? ['checkout', '-b', branch] : ['checkout', branch], execaOpts);
}

/**
 * Create a tag on the head commit in the current git repository.
 *
 * @param {String} tagName The tag name to create.
 * @param {String} [sha] The commit on which to create the tag. If undefined the tag is created on the last commit.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 */
export async function gitTagVersion(tagName, sha, execaOpts) {
  await execa('git', sha ? ['tag', '-f', tagName, sha] : ['tag', tagName], execaOpts);
}

/**
 * Create a shallow clone of a git repository and change the current working directory to the cloned repository root.
 * The shallow will contain a limited number of commit and no tags.
 *
 * @param {String} repositoryUrl The path of the repository to clone.
 * @param {String} [branch='master'] the branch to clone.
 * @param {Number} [depth=1] The number of commit to clone.
 * @return {String} The path of the cloned repository.
 */
export async function gitShallowClone(repositoryUrl, branch = 'master', depth = 1) {
  const cwd = tempy.directory();

  await execa('git', ['clone', '--no-hardlinks', '--no-tags', '-b', branch, '--depth', depth, repositoryUrl, cwd], {
    cwd,
  });
  return cwd;
}

/**
 * Create a git repo with a detached head from another git repository and change the current working directory to the new repository root.
 *
 * @param {String} repositoryUrl The path of the repository to clone.
 * @param {Number} head A commit sha of the remote repo that will become the detached head of the new one.
 * @return {String} The path of the new repository.
 */
export async function gitDetachedHead(repositoryUrl, head) {
  const cwd = tempy.directory();

  await execa('git', ['init'], {cwd});
  await execa('git', ['remote', 'add', 'origin', repositoryUrl], {cwd});
  await execa('git', ['fetch', repositoryUrl], {cwd});
  await execa('git', ['checkout', head], {cwd});
  return cwd;
}

/**
 * Get the first commit sha referenced by the tag `tagName` in the remote repository.
 *
 * @param {String} repositoryUrl The repository remote URL.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {String} The HEAD sha of the remote repository.
 */
export async function gitRemoteHead(repositoryUrl, execaOpts) {
  return (await execa.stdout('git', ['ls-remote', repositoryUrl, 'HEAD'], execaOpts))
    .split('\n')
    .filter(head => Boolean(head))
    .map(head => head.match(/^(\S+)/)[1])[0];
}

/**
 *Get the list of staged files.
 *
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Array<String>} Array of staged files path.
 */
export async function gitStaged(execaOpts) {
  return (await execa.stdout('git', ['status', '--porcelain'], execaOpts))
    .split('\n')
    .filter(status => status.startsWith('A '))
    .map(status => status.match(/^A\s+(.+)$/)[1]);
}

/**
 * Get the list of files included in a commit.
 *
 * @param {String} [ref='HEAD'] The git reference for which to retrieve the files.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Array<String>} The list of files path included in the commit.
 */
export async function gitCommitedFiles(ref = 'HEAD', execaOpts) {
  return (await execa.stdout('git', ['diff-tree', '-r', '--name-only', '--no-commit-id', '-r', ref], execaOpts))
    .split('\n')
    .filter(file => Boolean(file));
}
