import test from 'ava';
import {outputFile, appendFile} from 'fs-extra';
import {add, getModifiedFiles, commit, gitHead, push} from '../lib/git';
import {gitRepo, gitCommits, gitGetCommits, gitStaged, gitRemoteHead} from './helpers/git-utils';

// Save the current working diretory
const cwd = process.cwd();

test.afterEach.always(() => {
	// Restore the current working directory
	process.chdir(cwd);
});

test.serial('Add file to index', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();
	// Create files
	await outputFile('file1.js', '');
	// Add files and commit
	await add(['.']);

	await t.deepEqual(await gitStaged(), ['file1.js']);
});

test.serial('Get the modified files, ignoring files in .gitignore but including untracked ones', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();
	// Create files
	await outputFile('file1.js', '');
	await outputFile('dir/file2.js', '');
	await outputFile('file3.js', '');
	// Create .gitignore to ignore file3.js
	await outputFile('.gitignore', 'file.3.js');
	// Add files and commit
	await add(['.']);
	await commit('Test commit');
	// Update file1.js and dir/file2.js
	await appendFile('file1.js', 'Test content');
	await appendFile('dir/file2.js', 'Test content');
	// Add untracked file
	await outputFile('file4.js', 'Test content');

	await t.deepEqual(await getModifiedFiles(), ['file4.js', 'dir/file2.js', 'file1.js']);
});

test.serial('Returns [] if there is no modified files', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();

	await t.deepEqual(await getModifiedFiles(), []);
});

test.serial('Commit added files', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();
	// Create files
	await outputFile('file1.js', '');
	// Add files and commit
	await add(['.']);
	await commit('Test commit');

	await t.true((await gitGetCommits()).length === 1);
});

test.serial('Get the last commit sha', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();
	// Add commits to the master branch
	const [{hash}] = await gitCommits(['First']);

	const result = await gitHead();

	t.is(result, hash);
});

test.serial('Throw error if the last commit sha cannot be found', async t => {
	// Create a git repository, set the current working directory at the root of the repo
	await gitRepo();

	await t.throws(gitHead());
});

test.serial('Push commit to remote repository', async t => {
	// Create a git repository with a remote, set the current working directory at the root of the repo
	const repo = await gitRepo(true);
	const [{hash}] = await gitCommits(['Test commit']);

	await push(repo, 'master');

	t.is(await gitRemoteHead(repo), hash);
});
