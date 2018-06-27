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
  delete process.env.GIT_AUTHOR_NAME;
  delete process.env.GIT_AUTHOR_EMAIL;
  delete process.env.GIT_COMMITTER_NAME;
  delete process.env.GIT_COMMITTER_EMAIL;
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

test.serial('Prepare from a shallow clone', async t => {
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
  await t.context.m.prepare(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.deepEqual((await gitCommitedFiles()).sort(), ['dist/file.js', 'package.json'].sort());
  const [commit] = await gitGetCommits();
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${branch})`);
});

test.serial('Prepare from a detached head repository', async t => {
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
  await t.context.m.prepare(pluginConfig, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});

  t.deepEqual((await gitCommitedFiles()).sort(), ['dist/file.js', 'package.json'].sort());
  const [commit] = await gitGetCommits();
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD)`);
});

test.serial('Verify authentication only on the fist call', async t => {
  const branch = 'master';
  const repositoryUrl = await gitRepo(true);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  const options = {repositoryUrl, branch, prepare: ['@semantic-release/npm']};

  await t.notThrows(t.context.m.verifyConditions({}, {options, logger: t.context.logger}));
  await t.context.m.prepare({}, {logger: t.context.logger, options: {repositoryUrl, branch}, nextRelease});
});

test('Throw SemanticReleaseError if prepare config is invalid', async t => {
  const message = 42;
  const assets = true;
  const options = {prepare: ['@semantic-release/npm', {path: '@semantic-release/git', message, assets}]};

  const errors = [...(await t.throws(t.context.m.verifyConditions({}, {options, logger: t.context.logger})))];

  t.is(errors[0].name, 'SemanticReleaseError');
  t.is(errors[0].code, 'EINVALIDASSETS');
  t.is(errors[1].name, 'SemanticReleaseError');
  t.is(errors[1].code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if config is invalid', async t => {
  const message = 42;
  const assets = true;

  const errors = [
    ...(await t.throws(t.context.m.verifyConditions({message, assets}, {options: {}, logger: t.context.logger}))),
  ];

  t.is(errors[0].name, 'SemanticReleaseError');
  t.is(errors[0].code, 'EINVALIDASSETS');
  t.is(errors[1].name, 'SemanticReleaseError');
  t.is(errors[1].code, 'EINVALIDMESSAGE');
});
