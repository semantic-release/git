import test from 'ava';
import {stub} from 'sinon';
import verify from '../lib/verify';
import {gitRepo, gitCommits} from './helpers/git-utils';

// Save the current process.env
const envBackup = Object.assign({}, process.env);
// Save the current working diretory
const cwd = process.cwd();

test.beforeEach(async t => {
	// Delete env paramaters that could have been set on the machine running the tests
	delete process.env.GH_TOKEN;
	delete process.env.git_TOKEN;
	delete process.env.GIT_CREDENTIALS;
	delete process.env.GIT_AUTHOR_NAME;
	delete process.env.GIT_AUTHOR_EMAIL;
	delete process.env.GIT_COMMITTER_NAME;
	delete process.env.GIT_COMMITTER_EMAIL;
	// Stub the logger functions
	t.context.log = stub();
	t.context.logger = {log: t.context.log};
	t.context.repositoryUrl = await gitRepo(true);
	t.context.branch = 'master';
	t.context.options = {repositoryUrl: t.context.repositoryUrl, branch: t.context.branch};
});

test.afterEach.always(() => {
	// Restore process.env
	process.env = envBackup;
	// Restore the current working directory
	process.chdir(cwd);
});

test('Throw SemanticReleaseError if "assets" option is not a String or false or an Array of Objects', async t => {
	const assets = true;
	const [error] = await t.throws(verify({assets}, {options: t.context.options}, t.context.logger));

	t.is(error.name, 'SemanticReleaseError');
	t.is(error.code, 'EINVALIDASSETS');
});

test('Throw SemanticReleaseError if "assets" option is not an Array with invalid elements', async t => {
	const assets = ['file.js', 42];
	const [error] = await t.throws(verify({assets}, {options: t.context.options}, t.context.logger));

	t.is(error.name, 'SemanticReleaseError');
	t.is(error.code, 'EINVALIDASSETS');
});

test.serial('Verify "assets" is a String', async t => {
	await gitCommits(['Test commit']);
	const assets = 'file2.js';

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify "assets" is an Array of String', async t => {
	await gitCommits(['Test commit']);
	const assets = ['file1.js', 'file2.js'];

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify "assets" is an Object with a path property', async t => {
	await gitCommits(['Test commit']);
	const assets = {path: 'file2.js'};

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify "assets" is an Array of Object with a path property', async t => {
	await gitCommits(['Test commit']);
	const assets = [{path: 'file1.js'}, {path: 'file2.js'}];

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify disabled "assets" (set to false)', async t => {
	await gitCommits(['Test commit']);
	const assets = false;

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify "assets" is an Array of glob Arrays', async t => {
	await gitCommits(['Test commit']);
	const assets = [['dist/**', '!**/*.js'], 'file2.js'];

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test.serial('Verify "assets" is an Array of Object with a glob Arrays in path property', async t => {
	await gitCommits(['Test commit']);
	const assets = [{path: ['dist/**', '!**/*.js']}, {path: 'file2.js'}];

	await t.notThrows(verify({assets}, {options: t.context.options}, t.context.logger));
});

test('Throw SemanticReleaseError if "message" option is not a String', async t => {
	const message = 42;
	const [error] = await t.throws(verify({message}, {options: t.context.options}, t.context.logger));

	t.is(error.name, 'SemanticReleaseError');
	t.is(error.code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if "message" option is an empty String', async t => {
	const message = ' ';
	const [error] = await t.throws(verify({message}, {options: t.context.options}, t.context.logger));

	t.is(error.name, 'SemanticReleaseError');
	t.is(error.code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if "message" option is a whitespace String', async t => {
	const message = '  \n \r ';
	const [error] = await t.throws(verify({message}, {options: t.context.options}, t.context.logger));

	t.is(error.name, 'SemanticReleaseError');
	t.is(error.code, 'EINVALIDMESSAGE');
});

test.serial('Verify undefined "message" and "assets"', async t => {
	await gitCommits(['Test commit']);

	await t.notThrows(verify({}, {options: t.context.options}, t.context.logger));
});
