import path from 'path';
import test from 'ava';
import {outputFile} from 'fs-extra';
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

test.beforeEach(t => {
  // Clear npm cache to refresh the module state
  clearModule('..');
  t.context.m = require('..');
  // Stub the logger
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
});

test('Prepare from a shallow clone', async t => {
  const branch = {name: 'master'};
  let {cwd, repositoryUrl} = await gitRepo(true);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '1.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Initial content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Initial content');
  await add('.', {cwd});
  await gitCommits(['First'], {cwd});
  await gitTagVersion('v1.0.0', undefined, {cwd});
  await push(repositoryUrl, branch.name, {cwd});
  cwd = await gitShallowClone(repositoryUrl);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '2.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Updated content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.prepare(pluginConfig, {
    cwd,
    branch,
    options: {repositoryUrl},
    nextRelease,
    logger: t.context.logger,
  });

  t.deepEqual((await gitCommitedFiles('HEAD', {cwd})).sort(), ['dist/file.js', 'package.json'].sort());
  const [commit] = await gitGetCommits(undefined, {cwd});
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch.name}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${branch.name})`);
});

test('Prepare from a detached head repository', async t => {
  const branch = {name: 'master'};
  let {cwd, repositoryUrl} = await gitRepo(true);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '1.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Initial content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Initial content');
  await add('.', {cwd});
  const [{hash}] = await gitCommits(['First'], {cwd});
  await gitTagVersion('v1.0.0', undefined, {cwd});
  await push(repositoryUrl, branch.name, {cwd});
  cwd = await gitDetachedHead(repositoryUrl, hash);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '2.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Updated content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
    assets: '**/*.{js,json}',
  };
  await t.context.m.prepare(pluginConfig, {
    cwd,
    branch,
    options: {repositoryUrl},
    nextRelease,
    logger: t.context.logger,
  });

  t.deepEqual((await gitCommitedFiles('HEAD', {cwd})).sort(), ['dist/file.js', 'package.json'].sort());
  const [commit] = await gitGetCommits(undefined, {cwd});
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch.name}`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD)`);
});

test('Verify authentication only on the fist call', async t => {
  const branch = {name: 'master'};
  const {cwd, repositoryUrl} = await gitRepo(true);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  const options = {repositoryUrl, prepare: ['@semantic-release/npm']};

  t.notThrows(() => t.context.m.verifyConditions({}, {cwd, options, logger: t.context.logger}));
  await t.context.m.prepare({}, {cwd, options: {repositoryUrl}, branch, nextRelease, logger: t.context.logger});
});

test('Throw SemanticReleaseError if prepare config is invalid', t => {
  const message = 42;
  const assets = true;
  const options = {prepare: ['@semantic-release/npm', {path: '@semantic-release/git', message, assets}]};

  const errors = [...t.throws(() => t.context.m.verifyConditions({}, {options, logger: t.context.logger}))];

  t.is(errors[0].name, 'SemanticReleaseError');
  t.is(errors[0].code, 'EINVALIDASSETS');
  t.is(errors[1].name, 'SemanticReleaseError');
  t.is(errors[1].code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if config is invalid', t => {
  const message = 42;
  const assets = true;

  const errors = [
    ...t.throws(() => t.context.m.verifyConditions({message, assets}, {options: {}, logger: t.context.logger})),
  ];

  t.is(errors[0].name, 'SemanticReleaseError');
  t.is(errors[0].code, 'EINVALIDASSETS');
  t.is(errors[1].name, 'SemanticReleaseError');
  t.is(errors[1].code, 'EINVALIDMESSAGE');
});
