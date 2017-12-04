import test from 'ava';
import {outputFile, readFile} from 'fs-extra';
import {stub} from 'sinon';
import publish from '../lib/publish';
import {gitRepo, gitGetCommit, gitRemoteTagHead, gitCommitedFiles} from './helpers/git-utils';

test.beforeEach(async t => {
  // Save the current process.env
  t.context.env = Object.assign({}, process.env);
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

test.afterEach.always(t => {
  // Restore process.env
  process.env = Object.assign({}, t.context.env);
});

test.serial('With default values', async t => {
  const pluginConfig = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the remote repo has a the version referencing the same commit sha at the local head
  const commit = (await gitGetCommit())[0];
  t.is(await gitRemoteTagHead(t.context.repositoryUrl, nextRelease.gitTag), commit.hash);
  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
  // Verify the content of the CHANGELOG.md
  t.is((await readFile('CHANGELOG.md')).toString(), `${nextRelease.notes}\n`);

  t.is(commit.subject, `chore(release): ${nextRelease.version} [skip ci]`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${t.context.branch}, tag: ${nextRelease.gitTag})`);

  t.is(commit.author.name, 'semantic-release-bot');
  t.is(commit.author.email, 'semantic-release-bot@martynus.net');

  t.true(t.context.log.calledWith('Create %s', 'CHANGELOG.md'));
  t.true(t.context.log.calledWith('Add %s to the release commit', 'CHANGELOG.md'));
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 1));
  t.true(t.context.log.calledWith('Creating tag %s', nextRelease.gitTag));
  t.true(t.context.log.calledWith('Published Github release: %s', nextRelease.gitTag));
});

test.serial('Commit package.json and npm-shrinkwrap.json if they exists and have been changed', async t => {
  const pluginConfig = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('package.json', "{name: 'test-package'}");
  await outputFile('npm-shrinkwrap.json', "{name: 'test-package'}");

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'npm-shrinkwrap.json', 'package.json']);
  t.true(t.context.log.calledWith('Add %s to the release commit', 'package.json'));
  t.true(t.context.log.calledWith('Add %s to the release commit', 'npm-shrinkwrap.json'));
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 3));
});

test.serial('Prepend the CHANGELOG.md if there is an existing one', async t => {
  const pluginConfig = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
  // Verify the content of the CHANGELOG.md
  t.is((await readFile('CHANGELOG.md')).toString(), `${nextRelease.notes}\n\nInitial CHANGELOG\n`);
  // Verify the commit message contains on the new release notes
  const commit = (await gitGetCommit())[0];
  t.is(commit.subject, `chore(release): ${nextRelease.version} [skip ci]`);
  t.is(commit.body, `${nextRelease.notes}\n`);
});

test.serial('Disable CHANGELOG.md update', async t => {
  const pluginConfig = {changelog: false};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), []);
  // Verify the content of the CHANGELOG.md
  t.is((await readFile('CHANGELOG.md')).toString(), 'Initial CHANGELOG');
});

test.serial('Skip CHANGELOG.md update is the release is empty', async t => {
  const pluginConfig = {changelog: true};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), []);
  // Verify the content of the CHANGELOG.md
  t.is((await readFile('CHANGELOG.md')).toString(), 'Initial CHANGELOG');
});

test.serial('Exclude package.json and and npm-shrinkwrap.json if "assets" is defined without it', async t => {
  const pluginConfig = {assets: []};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');
  await outputFile('package.json', "{name: 'test-package'}");
  await outputFile('npm-shrinkwrap.json', "{name: 'test-package'}");

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
});

test.serial('Allow to customize the commit message', async t => {
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}
    
Last release: \${lastRelease.version}
\${nextRelease.notes}`,
  };
  const lastRelease = {version: 'v1.0.0'};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile('CHANGELOG.md', 'Initial CHANGELOG');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
  // Verify the content of the CHANGELOG.md
  t.is((await readFile('CHANGELOG.md')).toString(), `${nextRelease.notes}\n\nInitial CHANGELOG\n`);
  // Verify the commit message contains on the new release notes
  const commit = (await gitGetCommit())[0];
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${t.context.branch}`);
  t.is(commit.body, `Last release: ${lastRelease.version}\n${nextRelease.notes}\n`);
});

test.serial('Commit files matching the patterns in "assets"', async t => {
  const pluginConfig = {
    assets: ['file1.js', '*1.js', ['dir/*.js', '!dir/*.css'], 'file5.js', 'dir2', ['**/*.js', '!**/*.js']],
  };
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  // Create .gitignore to ignore file5.js
  await outputFile('.gitignore', 'file5.js');

  await outputFile('file1.js', 'Test content');
  await outputFile('dir/file2.js', 'Test content');
  await outputFile('dir/file3.css', 'Test content');
  await outputFile('file4.js', 'Test content');
  await outputFile('file5.js', 'Test content');
  await outputFile('dir2/file6.js', 'Test content');
  await outputFile('dir2/file7.css', 'Test content');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is ignore because it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(await gitCommitedFiles(), [
    'CHANGELOG.md',
    'dir/file2.js',
    'dir2/file6.js',
    'dir2/file7.css',
    'file1.js',
  ]);

  // Found 6 files as file5.js is referenced in `asset` but ignored due to .gitignore
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 6));
});

test.serial('Commit files matching the patterns in "assets" as Objects', async t => {
  const pluginConfig = {
    assets: ['file1.js', {path: ['dir/*.js', '!dir/*.css']}, {path: 'file5.js'}, 'dir2'],
  };
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  // Create .gitignore to ignore file5.js
  await outputFile('.gitignore', 'file5.js');

  await outputFile('file1.js', 'Test content');
  await outputFile('dir/file2.js', 'Test content');
  await outputFile('dir/file3.css', 'Test content');
  await outputFile('file4.js', 'Test content');
  await outputFile('file5.js', 'Test content');
  await outputFile('dir2/file6.js', 'Test content');
  await outputFile('dir2/file7.css', 'Test content');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is ignore because it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(await gitCommitedFiles(), [
    'CHANGELOG.md',
    'dir/file2.js',
    'dir2/file6.js',
    'dir2/file7.css',
    'file1.js',
  ]);
  // Found 6 files as file5.js is referenced in `asset` but ignored due to .gitignore
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 6));
});

test.serial('Commit files matching the patterns in "assets" as single glob', async t => {
  const pluginConfig = {assets: 'dist/**/*.js'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await outputFile('dist/file1.js', 'Test content');
  await outputFile('dist/file2.css', 'Test content');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'dist/file1.js']);
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 2));
});

test.serial('Commit files matching the patterns in "assets", including dot files', async t => {
  const pluginConfig = {assets: 'dist'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await outputFile('dist/.dotfile', 'Test content');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'dist/.dotfile']);
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 2));
});

test.serial('Skip negated pattern if its alone in its group', async t => {
  const pluginConfig = {assets: '!**/*'};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await outputFile('file.js', 'Test content');

  await publish(pluginConfig, t.context.options, lastRelease, nextRelease, t.context.logger);

  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md']);
  t.true(t.context.log.calledWith('Found %d file(s) to commit', 1));
});
