import test from 'ava';
import {outputFile} from 'fs-extra';
import {stub} from 'sinon';
import publish from '../lib/publish';
import {gitRepo, gitGetCommits, gitCommitedFiles} from './helpers/git-utils';

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(async t => {
  // Delete env variables in case they are on the machine running the tests
  delete process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GIT_CREDENTIALS;
  delete process.env.GIT_EMAIL;
  delete process.env.GIT_USERNAME;
  // Stub the logger functions
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
  // Create a git repository with a remote, set the current working directory at the root of the repo
  t.context.repositoryUrl = await gitRepo(true);
  t.context.branch = 'master';
  t.context.options = {repositoryUrl: t.context.repositoryUrl, branch: t.context.branch};
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
});

test.serial(
  'Commit CHANGELOG.md, package.json, package-lock.json, and npm-shrinkwrap.json if they exists and have been changed',
  async t => {
    const pluginConfig = {};
    const lastRelease = {};
    const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

    await outputFile('CHANGELOG.md', 'Initial CHANGELOG');
    await outputFile('package.json', "{name: 'test-package'}");
    await outputFile('package-lock.json', "{name: 'test-package'}");
    await outputFile('npm-shrinkwrap.json', "{name: 'test-package'}");

    await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

    // Verify the remote repo has a the version referencing the same commit sha at the local head
    const [commit] = await gitGetCommits();
    // Verify the files that have been commited
    t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'npm-shrinkwrap.json', 'package-lock.json', 'package.json']);

    t.is(commit.subject, `chore(release): ${nextRelease.version} [skip ci]`);
    t.is(commit.body, `${nextRelease.notes}\n`);
    t.is(commit.gitTags, `(HEAD -> ${t.context.branch})`);

    t.is(commit.author.name, 'semantic-release-bot');
    t.is(commit.author.email, 'semantic-release-bot@martynus.net');

    t.deepEqual(t.context.log.args[0], ['Add %s to the release commit', 'CHANGELOG.md']);
    t.deepEqual(t.context.log.args[1], ['Add %s to the release commit', 'package.json']);
    t.deepEqual(t.context.log.args[2], ['Add %s to the release commit', 'package-lock.json']);
    t.deepEqual(t.context.log.args[3], ['Add %s to the release commit', 'npm-shrinkwrap.json']);
    t.deepEqual(t.context.log.args[4], ['Found %d file(s) to commit', 4]);
    t.deepEqual(t.context.log.args[5], ['Creating tag %s', nextRelease.gitTag]);
    t.deepEqual(t.context.log.args[6], ['Published Git release: %s', nextRelease.gitTag]);
  }
);

test.serial(
  'Exclude CHANGELOG.md, package.json, package-lock.json, and npm-shrinkwrap.json if "assets" is defined without it',
  async t => {
    const pluginConfig = {assets: []};
    const lastRelease = {};
    const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
    await outputFile('CHANGELOG.md', 'Initial CHANGELOG');
    await outputFile('package.json', "{name: 'test-package'}");
    await outputFile('package-lock.json', "{name: 'test-package'}");
    await outputFile('npm-shrinkwrap.json', "{name: 'test-package'}");

    await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

    // Verify no files have been commited
    t.deepEqual(await gitCommitedFiles(), []);
    t.deepEqual(t.context.log.args[0], ['Creating tag %s', nextRelease.gitTag]);
    t.deepEqual(t.context.log.args[1], ['Published Git release: %s', nextRelease.gitTag]);
  }
);

test.serial('Allow to customize the commit message', async t => {
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}

Last release: \${lastRelease.version}
\${nextRelease.notes}`,
  };
  const lastRelease = {version: 'v1.0.0'};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
  // Verify the commit message contains on the new release notes
  const [commit] = await gitGetCommits();
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${t.context.branch}`);
  t.is(commit.body, `Last release: ${lastRelease.version}\n${nextRelease.notes}\n`);
});

test.serial('Commit files matching the patterns in "assets"', async t => {
  const pluginConfig = {
    assets: ['file1.js', '*1.js', ['dir/*.js', '!dir/*.css'], 'file5.js', 'dir2', ['**/*.js', '!**/*.js']],
  };
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  // Create .gitignore to ignore file5.js
  await outputFile('.gitignore', 'file5.js');
  await outputFile('file1.js', 'Test content');
  await outputFile('dir/file2.js', 'Test content');
  await outputFile('dir/file3.css', 'Test content');
  await outputFile('file4.js', 'Test content');
  await outputFile('file5.js', 'Test content');
  await outputFile('dir2/file6.js', 'Test content');
  await outputFile('dir2/file7.css', 'Test content');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is ignore because it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(await gitCommitedFiles(), ['dir/file2.js', 'dir2/file6.js', 'dir2/file7.css', 'file1.js']);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 4]);
});

test.serial('Commit files matching the patterns in "assets" as Objects', async t => {
  const pluginConfig = {
    assets: ['file1.js', {path: ['dir/*.js', '!dir/*.css']}, {path: 'file5.js'}, 'dir2'],
  };
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  // Create .gitignore to ignore file5.js
  await outputFile('.gitignore', 'file5.js');

  await outputFile('file1.js', 'Test content');
  await outputFile('dir/file2.js', 'Test content');
  await outputFile('dir/file3.css', 'Test content');
  await outputFile('file4.js', 'Test content');
  await outputFile('file5.js', 'Test content');
  await outputFile('dir2/file6.js', 'Test content');
  await outputFile('dir2/file7.css', 'Test content');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is ignore because it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(await gitCommitedFiles(), ['dir/file2.js', 'dir2/file6.js', 'dir2/file7.css', 'file1.js']);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 4]);
});

test.serial('Commit files matching the patterns in "assets" as single glob', async t => {
  const pluginConfig = {assets: 'dist/**/*.js'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  await outputFile('dist/file1.js', 'Test content');
  await outputFile('dist/file2.css', 'Test content');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles(), ['dist/file1.js']);

  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test.serial('Commit files matching the patterns in "assets", including dot files', async t => {
  const pluginConfig = {assets: 'dist'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  await outputFile('dist/.dotfile', 'Test content');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles(), ['dist/.dotfile']);

  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test.serial('Skip negated pattern if its alone in its group', async t => {
  const pluginConfig = {assets: ['!**/*', 'file.js']};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  await outputFile('file.js', 'Test content');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles(), ['file.js']);

  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test.serial('Skip commit if there is no files to commit', async t => {
  const pluginConfig = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), []);
  t.deepEqual(t.context.log.args[0], ['Creating tag %s', nextRelease.gitTag]);
  t.deepEqual(t.context.log.args[1], ['Published Git release: %s', nextRelease.gitTag]);
});

test.serial('Skip commit if all the modified files are in .gitignore', async t => {
  const pluginConfig = {assets: 'dist'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};

  await outputFile('dist/files1.js', 'Test content');
  await outputFile('.gitignore', 'dist/**/*');

  await publish(pluginConfig, {options: t.context.options, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), []);
  t.deepEqual(t.context.log.args[0], ['Creating tag %s', nextRelease.gitTag]);
  t.deepEqual(t.context.log.args[1], ['Published Git release: %s', nextRelease.gitTag]);
});
