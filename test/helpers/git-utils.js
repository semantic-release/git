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
	const dir = tempy.directory();

	process.chdir(dir);
	await execa('git', ['init'].concat(withRemote ? ['--bare'] : []));

	if (withRemote) {
		await initBareRepo(fileUrl(dir), branch);
		await gitShallowClone(fileUrl(dir));
	} else {
		await gitCheckout(branch);
	}
	return fileUrl(dir);
}

/**
 * Initialize an existing bare repository:
 * - Clone the repository
 * - Change the current working directory to the clone root
 * - Create a default branch
 * - Create an initial commits
 * - Push to origin
 *
 * @param {String} origin The URL of the bare repository.
 * @param {String} [branch='master'] the branch to initialize.
 */
export async function initBareRepo(origin, branch = 'master') {
	const clone = tempy.directory();
	await execa('git', ['clone', '--no-hardlinks', origin, clone]);
	process.chdir(clone);
	await gitCheckout(branch);
	await gitCommits(['Initial commit']);
	await execa('git', ['push', origin, branch]);
}

/**
 * Create commits on the current git repository.
 *
 * @param {Array<string>} messages commit messages.
 *
 * @returns {Array<Commit>} The created commits, in reverse order (to match `git log` order).
 */
export async function gitCommits(messages) {
	await pReduce(
		messages,
		async (commits, msg) => {
			const stdout = await execa.stdout('git', ['commit', '-m', msg, '--allow-empty', '--no-gpg-sign']);
			const [, hash] = /^\[(?:\w+)\(?.*?\)?(\w+)\] .+(?:\n|$)/.exec(stdout);
			commits.push(hash);
			return commits;
		},
		[]
	);
	return (await gitGetCommits()).slice(0, messages.length);
}

/**
 * Checkout a branch on the current git repository.
 *
 * @param {String} branch Branch name.
 * @param {boolean} create `true` to create the branche ans switch, `false` to only switch.
 */
export async function gitCheckout(branch, create = true) {
	await execa('git', create ? ['checkout', '-b', branch] : ['checkout', branch]);
}

/**
 * Create a tag on the head commit in the current git repository.
 *
 * @param {String} tagName The tag name to create.
 * @param {String} [sha] The commit on which to create the tag. If undefined the tag is created on the last commit.
 *
 * @return {String} The commit sha of the created tag.
 */
export async function gitTagVersion(tagName, sha) {
	await execa('git', sha ? ['tag', '-f', tagName, sha] : ['tag', tagName]);
	return execa.stdout('git', ['rev-list', '-1', '--tags', tagName]);
}

/**
 * Create a shallow clone of a git repository and change the current working directory to the cloned repository root.
 * The shallow will contain a limited number of commit and no tags.
 *
 * @param {String} origin The path of the repository to clone.
 * @param {String} [branch='master'] The branch to clone.
 * @param {Number} [depth=1] The number of commit to clone.
 * @return {String} The path of the cloned repository.
 */
export async function gitShallowClone(origin, branch = 'master', depth = 1) {
	const dir = tempy.directory();

	process.chdir(dir);
	await execa('git', ['clone', '--no-hardlinks', '--no-tags', '-b', branch, '--depth', depth, origin, dir]);
	return dir;
}

/**
 * @return {Array<String>} Array of staged files path.
 */
export async function gitStaged() {
	return (await execa.stdout('git', ['status', '--porcelain']))
		.split('\n')
		.filter(status => status.startsWith('A '))
		.map(status => status.match(/^A\s+(.+)$/)[1]);
}

/**
 * Get the list of files included in a commit.
 *
 * @param {String} [ref='HEAD'] The git reference for which to retrieve the files.
 * @return {Array<String>} The list of files path included in the commit.
 */
export async function gitCommitedFiles(ref = 'HEAD') {
	return (await execa.stdout('git', ['diff-tree', '-r', '--name-only', '--no-commit-id', '-r', ref]))
		.split('\n')
		.filter(file => Boolean(file));
}

/**
 * Get the list of parsed commits since a git reference.
 *
 * @param {String} [from] Git reference from which to seach commits.
 * @return {Array<Object>} The list of parsed commits.
 */
export async function gitGetCommits(from) {
	Object.assign(gitLogParser.fields, {hash: 'H', message: 'B', gitTags: 'd', committerDate: {key: 'ci', type: Date}});
	return (await getStream.array(gitLogParser.parse({_: `${from ? from + '..' : ''}HEAD`}))).map(commit => {
		commit.message = commit.message.trim();
		commit.gitTags = commit.gitTags.trim();
		return commit;
	});
}

/**
 * Create a git repo with a detached head from another git repository and change the current working directory to the new repository root.
 *
 * @param {String} origin The path of the repository to clone.
 * @param {Number} head A commit sha of the origin repo that will become the detached head of the new one.
 * @return {String} The path of the new repository.
 */
export async function gitDetachedHead(origin, head) {
	const dir = tempy.directory();

	process.chdir(dir);
	await execa('git', ['init']);
	await execa('git', ['remote', 'add', 'origin', origin]);
	await execa('git', ['fetch']);
	await execa('git', ['checkout', head]);
	return dir;
}

/**
 * Get the head commit sha on the remote repository.
 *
 * @param {String} origin The repository remote URL.
 * @return {String} The sha of the commit associated with `tagName` on the remote repository.
 */
export async function gitRemoteHead(origin) {
	return (await execa.stdout('git', ['ls-remote', origin, 'HEAD']))
		.split('\n')
		.filter(tag => Boolean(tag))
		.map(tag => tag.match(/^(\S+)/)[1])[0];
}
