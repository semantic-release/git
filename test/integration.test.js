import {outputFile, readFile} from 'fs-extra';
import test from 'ava';
import {stub} from 'sinon';
import clearModule from 'clear-module';
import {push, tag, add} from '../lib/git';
import {
  gitCommit,
  gitShallowClone,
  gitDetachedHead,
  gitCommitedFiles,
  gitGetCommit,
  gitCheckout,
} from './helpers/git-utils';
import gitbox from './helpers/gitbox';

test.before(async () => {
  // Start the local NPM registry
  await gitbox.start();
});

// Save the current process.env
const envBackup = Object.assign({}, process.env);
// Save the current working diretory
const cwd = process.cwd();

test.beforeEach(t => {
  // Delete env paramaters that could have been set on the machine running the tests
  delete process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GIT_CREDENTIALS;
  delete process.env.GIT_EMAIL;
  delete process.env.GIT_USERNAME;
  // Clear npm cache to refresh the module state
  clearModule('..');
  t.context.m = require('..');
  // Stub the logger
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  // Restore the current working directory
  process.chdir(cwd);
});

test.after.always(async () => {
  await gitbox.stop();
});

test.serial('Throws error if "gitCredentials" is invalid', async t => {
  process.env.GIT_CREDENTIALS = 'user:wrong_pass';
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo('unauthorized', branch);

  const error = await t.throws(
    t.context.m.verifyConditions(
      {gitCredentials: 'user:wrong_pass'},
      {logger: t.context.logger, options: {repositoryUrl, branch}}
    )
  );

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EGITNOPERMISSION');
  t.is(error.message, `The git credentials doesn't allow to push on the branch ${branch} of ${repositoryUrl}.`);
});

test.serial('Verify git "gitCredentials", set with "GIT_CREDENTIALS"', async t => {
  process.env.GIT_CREDENTIALS = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo('authorized', branch);

  await t.notThrows(t.context.m.verifyConditions({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
});

test.serial('Verify git "gitCredentials", set with "GITHUB_TOKEN"', async t => {
  process.env.GITHUB_TOKEN = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo('authorized-github', branch);

  await t.notThrows(t.context.m.verifyConditions({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
});

test.serial('Return "undefined" if no version tag exists', async t => {
  process.env.GITHUB_TOKEN = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl, authUrl} = await gitbox.createRepo('no-release', branch);

  await gitCommit('First');
  await tag('not-a-version');
  push(authUrl, branch);

  t.falsy(await t.context.m.getLastRelease({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
});

test.serial('Return last version published, even if tags are not in the shallow clone', async t => {
  process.env.GH_TOKEN = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl, authUrl} = await gitbox.createRepo('with-release', branch);

  await gitCommit('First');
  await tag('v1.0.0');
  await gitCommit('Second');
  await tag('v2.0.0');
  await gitCommit('Third');
  await tag('not-a-version');
  await push(authUrl, branch);

  await gitShallowClone(authUrl);

  const lastRelease = await t.context.m.getLastRelease(
    {},
    {logger: t.context.logger, options: {repositoryUrl, branch}}
  );
  t.deepEqual(lastRelease, {gitHead: 'v2.0.0', version: '2.0.0'});
});

test.serial('Return last version published from a detached head repository', async t => {
  process.env.GH_TOKEN = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl, authUrl} = await gitbox.createRepo('with-release-detached-head', branch);

  await gitCommit('First');
  await tag('v1.0.0');
  await gitCommit('Second');
  await tag('v2.0.0');
  const {hash: remoteHead} = await gitCommit('Third');
  await tag('not-a-version');
  await push(authUrl, branch);
  await gitCheckout('other-branch');
  await gitCommit('Second');
  await tag('v4.0.0');
  await push(authUrl, 'other-branch');
  await gitCheckout(branch, false);

  await gitDetachedHead(authUrl, remoteHead);

  const lastRelease = await t.context.m.getLastRelease(
    {},
    {logger: t.context.logger, options: {repositoryUrl, branch}}
  );
  t.deepEqual(lastRelease, {gitHead: 'v2.0.0', version: '2.0.0'});
});

test.serial('Publish from a shallow clone', async t => {
  process.env.GH_TOKEN = gitbox.gitCredential;
  process.env.GIT_EMAIL = 'user@email.com';
  process.env.GIT_USERNAME = 'user';
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl, authUrl} = await gitbox.createRepo('publish', branch);
  await outputFile('CHANGELOG.md', 'Version 1.0.0 changelog');
  await outputFile('package.json', "{name: 'test-package', version: '1.0.0'}");
  await outputFile('dist/file.js', 'Initial content');
  await outputFile('dist/file.css', 'Initial content');
  await add('.');
  await gitCommit('First');
  await tag('v1.0.0');
  await push(authUrl, branch);
  await gitShallowClone(authUrl);
  await outputFile('package.json', "{name: 'test-package', version: '2.0.0'}");
  await outputFile('dist/file.js', 'Updated content');
  await outputFile('dist/file.css', 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.publish(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.is((await readFile('CHANGELOG.md')).toString(), `${nextRelease.notes}\n\nVersion 1.0.0 changelog\n`);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'dist/file.js', 'package.json']);
  const commit = (await gitGetCommit())[0];
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${branch}, tag: ${nextRelease.gitTag})`);
  t.is(commit.author.name, process.env.GIT_USERNAME);
  t.is(commit.author.email, process.env.GIT_EMAIL);
});

test.serial('Publish from a detached head repository', async t => {
  process.env.GH_TOKEN = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl, authUrl} = await gitbox.createRepo('publish-detached-head', branch);
  await outputFile('CHANGELOG.md', 'Version 1.0.0 changelog');
  await outputFile('package.json', "{name: 'test-package', version: '1.0.0'}");
  await outputFile('dist/file.js', 'Initial content');
  await outputFile('dist/file.css', 'Initial content');
  await add('.');
  const {hash: remoteHead} = await gitCommit('First');
  await tag('v1.0.0');
  await push(authUrl, branch);
  await gitDetachedHead(authUrl, remoteHead);
  await outputFile('package.json', "{name: 'test-package', version: '2.0.0'}");
  await outputFile('dist/file.js', 'Updated content');
  await outputFile('dist/file.css', 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.publish(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.is((await readFile('CHANGELOG.md')).toString(), `${nextRelease.notes}\n\nVersion 1.0.0 changelog\n`);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'dist/file.js', 'package.json']);
  const commit = (await gitGetCommit())[0];
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD, tag: ${nextRelease.gitTag})`);
});

test.serial('Verify authentication only on the fist call', async t => {
  process.env.GIT_CREDENTIALS = gitbox.gitCredential;
  const branch = 'master';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo('complete-release', branch);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};

  await t.notThrows(t.context.m.verifyConditions({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
  t.falsy(await t.context.m.getLastRelease({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
  await t.context.m.publish({}, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});
});

test('Throw SemanticReleaseError if publish "assets" option is not a string or false or an array of objects', async t => {
  const assets = true;
  const error = await t.throws(
    t.context.m.verifyConditions(
      {},
      {options: {publish: ['@semantic-release/npm', {path: '@semantic-release/git', assets}]}, logger: t.context.logger}
    )
  );

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDASSETS');
});

test('Throw SemanticReleaseError if publish "assets" option is not an Array with invalid elements', async t => {
  const assets = ['file.js', 42];
  const error = await t.throws(
    t.context.m.verifyConditions(
      {},
      {options: {publish: ['@semantic-release/npm', {path: '@semantic-release/git', assets}]}, logger: t.context.logger}
    )
  );

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDASSETS');
});

test('Throw SemanticReleaseError if publish "message" option is not a String', async t => {
  const message = 42;
  const error = await t.throws(
    t.context.m.verifyConditions(
      {},
      {
        options: {publish: ['@semantic-release/npm', {path: '@semantic-release/git', message}]},
        logger: t.context.logger,
      }
    )
  );

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if publish "message" option is a whitespace String', async t => {
  const message = '  \n \r ';
  const error = await t.throws(
    t.context.m.verifyConditions(
      {},
      {
        options: {publish: ['@semantic-release/npm', {path: '@semantic-release/git', message}]},
        logger: t.context.logger,
      }
    )
  );
  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDMESSAGE');
});
