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

async function shallowCloneTest(t, stepFn, pluginConfig, expectCommit) {
  const branch = 'master';
  let {cwd, repositoryUrl} = await gitRepo(true);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '1.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Initial content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Initial content');
  await add('.', {cwd});
  await gitCommits(['First'], {cwd});
  await gitTagVersion('v1.0.0', undefined, {cwd});
  await push(repositoryUrl, branch, {cwd});
  cwd = await gitShallowClone(repositoryUrl);
  const numPriorCommits = (await gitGetCommits(undefined, {cwd})).length;
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '2.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Updated content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  await stepFn(pluginConfig, {
    cwd,
    options: {repositoryUrl, branch},
    nextRelease,
    logger: t.context.logger,
  });

  const commits = await gitGetCommits(undefined, {cwd});
  if (expectCommit) {
    t.is(commits.length, numPriorCommits + 1);
    const [commit] = commits;
    t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
    t.is(commit.body, `${nextRelease.notes}\n`);
    t.is(commit.gitTags, `(HEAD -> ${branch})`);
    t.deepEqual((await gitCommitedFiles('HEAD', {cwd})).sort(), ['dist/file.js', 'package.json'].sort());
  } else {
    t.is(commits.length, numPriorCommits);
  }
}

test('Prepare from a shallow clone with base configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.prepare,
    {
      message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
      assets: '**/*.{js,json}',
    },
    true
  );
});

test('Prepare from a shallow clone with "prepare" configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.prepare,
    {
      prepare: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    true
  );
});

test('Prepare from a shallow clone with "publish" configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.prepare,
    {
      publish: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    false
  );
});

test('Publish from a shallow clone with base configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.publish,
    {
      message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
      assets: '**/*.{js,json}',
    },
    false
  );
});

test('Publish from a shallow clone with "prepare" configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.publish,
    {
      prepare: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    false
  );
});

test('Publish from a shallow clone with "publish" configuration', async t => {
  await shallowCloneTest(
    t,
    t.context.m.publish,
    {
      publish: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    true
  );
});

async function detachedHeadTest(t, stepFn, pluginConfig, expectCommit) {
  const branch = 'master';
  let {cwd, repositoryUrl} = await gitRepo(true);
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '1.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Initial content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Initial content');
  await add('.', {cwd});
  const [{hash}] = await gitCommits(['First'], {cwd});
  await gitTagVersion('v1.0.0', undefined, {cwd});
  await push(repositoryUrl, branch, {cwd});
  cwd = await gitDetachedHead(repositoryUrl, hash);
  const numPriorCommits = (await gitGetCommits(undefined, {cwd})).length;
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package', version: '2.0.0'}");
  await outputFile(path.resolve(cwd, 'dist/file.js'), 'Updated content');
  await outputFile(path.resolve(cwd, 'dist/file.css'), 'Updated content');

  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Version 2.0.0 changelog'};
  await stepFn(pluginConfig, {
    cwd,
    options: {repositoryUrl, branch},
    nextRelease,
    logger: t.context.logger,
  });

  const commits = await gitGetCommits(undefined, {cwd});
  if (expectCommit) {
    t.is(commits.length, numPriorCommits + 1);
    const [commit] = commits;
    t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch}`);
    t.is(commit.body, `${nextRelease.notes}\n`);
    t.is(commit.gitTags, `(HEAD)`);
    t.deepEqual((await gitCommitedFiles('HEAD', {cwd})).sort(), ['dist/file.js', 'package.json'].sort());
  } else {
    t.is(commits.length, numPriorCommits);
  }
}

test('Prepare from a detached head repository with base configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.prepare,
    {
      message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
      assets: '**/*.{js,json}',
    },
    true
  );
});

test('Prepare from a detached head repository with "prepare" configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.prepare,
    {
      prepare: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    true
  );
});

test('Prepare from a detached head repository with "publish" configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.prepare,
    {
      publish: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    false
  );
});

test('Publish from a detached head repository with base configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.publish,
    {
      message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
      assets: '**/*.{js,json}',
    },
    false
  );
});

test('Publish from a detached head repository with "prepare" configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.publish,
    {
      prepare: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    false
  );
});

test('Publish from a detached head repository with "publish" configuration', async t => {
  await detachedHeadTest(
    t,
    t.context.m.publish,
    {
      publish: {
        message: `Release version \${nextRelease.version} from branch \${branch}\n\n\${nextRelease.notes}`,
        assets: '**/*.{js,json}',
      },
    },
    true
  );
});

test('Verify authentication only on the fist call for prepare', async t => {
  const branch = 'master';
  const {cwd, repositoryUrl} = await gitRepo(true);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  const options = {repositoryUrl, branch, prepare: ['@semantic-release/npm']};

  t.notThrows(() => t.context.m.verifyConditions({}, {cwd, options, logger: t.context.logger}));
  await t.context.m.prepare({}, {cwd, options: {repositoryUrl, branch}, nextRelease, logger: t.context.logger});
});

test('Verify authentication only on the fist call for publish', async t => {
  const branch = 'master';
  const {cwd, repositoryUrl} = await gitRepo(true);
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  const options = {repositoryUrl, branch, publish: ['@semantic-release/npm']};

  t.notThrows(() => t.context.m.verifyConditions({}, {cwd, options, logger: t.context.logger}));
  await t.context.m.publish({}, {cwd, options: {repositoryUrl, branch}, nextRelease, logger: t.context.logger});
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

test('Throw SemanticReleaseError if publish config is invalid', t => {
  const message = 42;
  const assets = true;
  const options = {publish: ['@semantic-release/npm', {path: '@semantic-release/git', message, assets}]};

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
