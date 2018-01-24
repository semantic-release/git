import {outputFile} from 'fs-extra';
import test from 'ava';
import {stub} from 'sinon';
import clearModule from 'clear-module';
import {push, add} from '../lib/git';
import {
  gitRepo,
  gitCommits,
  gitShallowClone,
  gitDetachedHead,
  gitCommitedFiles,
  gitGetCommits,
  gitTagVersion,
} from './helpers/git-utils';

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

test.serial('Publish from a shallow clone', async t => {
  process.env.GIT_EMAIL = 'user@email.com';
  process.env.GIT_USERNAME = 'user';
  const branch = 'master';
  const repositoryUrl = await gitRepo(true);
  await outputFile('package.json', "{name: 'test-package', version: '1.0.0'}");
  await outputFile('dist/file.js', 'Initial content');
  await outputFile('dist/file.css', 'Initial content');
  await add('.');
  await gitCommits(['First']);
  await gitTagVersion('v1.0.0');
  await push(repositoryUrl, branch);
  await gitShallowClone(repositoryUrl);
  await outputFile('package.json', "{name: 'test-package', version: '2.0.0'}");
  await outputFile('dist/file.js', 'Updated content');
  await outputFile('dist/file.css', 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.publish(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.deepEqual(await gitCommitedFiles(), ['dist/file.js', 'package.json']);
  const [commit] = await gitGetCommits();
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${branch})`);
  t.is(commit.author.name, process.env.GIT_USERNAME);
  t.is(commit.author.email, process.env.GIT_EMAIL);
});

test.serial('Publish from a detached head repository', async t => {
  const branch = 'master';
  const repositoryUrl = await gitRepo(true);
  await outputFile('package.json', "{name: 'test-package', version: '1.0.0'}");
  await outputFile('dist/file.js', 'Initial content');
  await outputFile('dist/file.css', 'Initial content');
  await add('.');
  const [{hash}] = await gitCommits(['First']);
  await gitTagVersion('v1.0.0');
  await push(repositoryUrl, branch);
  await gitDetachedHead(repositoryUrl, hash);
  await outputFile('package.json', "{name: 'test-package', version: '2.0.0'}");
  await outputFile('dist/file.js', 'Updated content');
  await outputFile('dist/file.css', 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.publish(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.deepEqual(await gitCommitedFiles(), ['dist/file.js', 'package.json']);
  const [commit] = await gitGetCommits();
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD)`);
});

test.serial('Verify authentication only on the fist call', async t => {
  const branch = 'master';
  const repositoryUrl = await gitRepo(true);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  await t.notThrows(t.context.m.verifyConditions({}, {logger: t.context.logger, options: {repositoryUrl, branch}}));
  await t.context.m.publish({}, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});
});

test('Throw SemanticReleaseError if publish "assets" option is invalid', async t => {
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

test('Throw SemanticReleaseError if publish "message" option is invalid', async t => {
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
