const path = require('path');
const test = require('ava');
const {outputFile, remove} = require('fs-extra');
const {stub} = require('sinon');
const prepare = require('../lib/prepare.js');
const {gitRepo, gitGetCommits, gitCommitedFiles, gitAdd, gitCommits, gitPush} = require('./helpers/git-utils.js');

test.beforeEach((t) => {
  // Stub the logger functions
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
});

test('Commit CHANGELOG.md, package.json, package-lock.json, and npm-shrinkwrap.json if they exists and have been changed', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  const changelogPath = path.resolve(cwd, 'CHANGELOG.md');
  const pkgPath = path.resolve(cwd, 'package.json');
  const pkgLockPath = path.resolve(cwd, 'package-lock.json');
  const shrinkwrapPath = path.resolve(cwd, 'npm-shrinkwrap.json');

  await outputFile(changelogPath, 'Initial CHANGELOG');
  await outputFile(pkgPath, "{name: 'test-package'}");
  await outputFile(pkgLockPath, "{name: 'test-package'}");
  await outputFile(shrinkwrapPath, "{name: 'test-package'}");

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the remote repo has a the version referencing the same commit sha at the local head
  const [commit] = await gitGetCommits(undefined, {cwd, env});
  // Verify the files that have been commited
  t.deepEqual(
    (await gitCommitedFiles('HEAD', {cwd, env})).sort(),
    ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json'].sort()
  );
  t.is(commit.subject, `chore(release): ${nextRelease.version} [skip ci]`);
  t.is(commit.body, `${nextRelease.notes}\n`);
  t.is(commit.gitTags, `(HEAD -> ${branch.name})`);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 4]);
  t.deepEqual(t.context.log.args[1], ['Prepared Git release: %s', nextRelease.gitTag]);
});

test('Exclude CHANGELOG.md, package.json, package-lock.json, and npm-shrinkwrap.json if "assets" is defined without it', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {assets: []};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'CHANGELOG.md'), 'Initial CHANGELOG');
  await outputFile(path.resolve(cwd, 'package.json'), "{name: 'test-package'}");
  await outputFile(path.resolve(cwd, 'package-lock.json'), "{name: 'test-package'}");
  await outputFile(path.resolve(cwd, 'npm-shrinkwrap.json'), "{name: 'test-package'}");

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify no files have been commited
  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), []);
});

test('Allow to customize the commit message', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    message: `Release version \${nextRelease.version} from branch \${branch}

Last release: \${lastRelease.version}
\${nextRelease.notes}`,
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {version: 'v1.0.0'};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile(path.resolve(cwd, 'CHANGELOG.md'), 'Initial CHANGELOG');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), ['CHANGELOG.md']);
  // Verify the commit message contains on the new release notes
  const [commit] = await gitGetCommits(undefined, {cwd, env});
  t.is(commit.subject, `Release version ${nextRelease.version} from branch ${branch.name}`);
  t.is(commit.body, `Last release: ${lastRelease.version}\n${nextRelease.notes}\n`);
});

test('Commit files matching the patterns in "assets"', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    assets: ['file1.js', '*1.js', ['dir/*.js', '!dir/*.css'], 'file5.js', 'dir2', ['**/*.js', '!**/*.js']],
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  // Create .gitignore to ignore file5.js
  await outputFile(path.resolve(cwd, '.gitignore'), 'file5.js');
  await outputFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir/file2.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir/file3.css'), 'Test content');
  await outputFile(path.resolve(cwd, 'file4.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'file5.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir2/file6.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir2/file7.css'), 'Test content');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is not ignored even if it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(
    (await gitCommitedFiles('HEAD', {cwd, env})).sort(),
    ['dir/file2.js', 'dir2/file6.js', 'dir2/file7.css', 'file1.js', 'file5.js'].sort()
  );
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 5]);
});

test('Commit files matching the patterns in "assets" as Objects', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    assets: ['file1.js', {path: ['dir/*.js', '!dir/*.css']}, {path: 'file5.js'}, 'dir2'],
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  // Create .gitignore to ignore file5.js
  await outputFile(path.resolve(cwd, '.gitignore'), 'file5.js');
  await outputFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir/file2.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir/file3.css'), 'Test content');
  await outputFile(path.resolve(cwd, 'file4.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'file5.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir2/file6.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dir2/file7.css'), 'Test content');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify file2 and file1 have been commited
  // file4.js is excluded as no glob matching
  // file3.css is ignored due to the negative glob '!dir/*.css'
  // file5.js is not ignored even if it's in the .gitignore
  // file6.js and file7.css are included because dir2 is expanded
  t.deepEqual(
    (await gitCommitedFiles('HEAD', {cwd, env})).sort(),
    ['dir/file2.js', 'dir2/file6.js', 'dir2/file7.css', 'file1.js', 'file5.js'].sort()
  );
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 5]);
});

test('Commit files matching the patterns in "assets" as single glob', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {assets: 'dist/**/*.js'};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'dist/file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'dist/file2.css'), 'Test content');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), ['dist/file1.js']);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test('Commit files matching the patterns in "assets", including dot files', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {assets: 'dist'};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'dist/.dotfile'), 'Test content');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), ['dist/.dotfile']);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test('Include deleted files in release commit', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    assets: ['file1.js'],
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'file2.js'), 'Test content');

  await gitAdd(['file1.js', 'file2.js'], {cwd, env});
  await gitCommits(['Add file1.js and file2.js'], {cwd, env});
  await gitPush(repositoryUrl, 'master', {cwd, env});

  await remove(path.resolve(cwd, 'file1.js'));
  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual((await gitCommitedFiles('HEAD', {cwd, env})).sort(), ['file1.js'].sort());
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test('Include ignored files in release commit by default', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    assets: ['*'],
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'file2.js'), 'Test content');
  await outputFile(path.resolve(cwd, '.gitignore'), 'file2.js');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual((await gitCommitedFiles('HEAD', {cwd, env})).sort(), ['file1.js', 'file2.js', '.gitignore'].sort());
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 3]);
});

test('Exclude ignored files in release commit with respectIgnoreFile', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {
    assets: ['*'],
    respectIgnoreFile: true,
  };
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await outputFile(path.resolve(cwd, 'file2.js'), 'Test content');
  await outputFile(path.resolve(cwd, '.gitignore'), 'file2.js');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual((await gitCommitedFiles('HEAD', {cwd, env})).sort(), ['file1.js', '.gitignore'].sort());
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 2]);
});

test('Set the commit author and committer name/email based on environment variables', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {
    GIT_AUTHOR_NAME: 'author name',
    GIT_AUTHOR_EMAIL: 'author email',
    GIT_COMMITTER_NAME: 'committer name',
    GIT_COMMITTER_EMAIL: 'committer email',
  };
  const lastRelease = {version: 'v1.0.0'};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};
  await outputFile(path.resolve(cwd, 'CHANGELOG.md'), 'Initial CHANGELOG');

  await prepare({}, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), ['CHANGELOG.md']);
  // Verify the commit message contains on the new release notes
  const [commit] = await gitGetCommits(undefined, {cwd, env});
  t.is(commit.author.name, 'author name');
  t.is(commit.author.email, 'author email');
  t.is(commit.committer.name, 'committer name');
  t.is(commit.committer.email, 'committer email');
});

test('Skip negated pattern if its alone in its group', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {assets: ['!**/*', 'file.js']};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0'};
  await outputFile(path.resolve(cwd, 'file.js'), 'Test content');

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), ['file.js']);
  t.deepEqual(t.context.log.args[0], ['Found %d file(s) to commit', 1]);
});

test('Skip commit if there is no files to commit', async (t) => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {};
  const branch = {name: 'master'};
  const options = {repositoryUrl};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await prepare(pluginConfig, {cwd, env, options, branch, lastRelease, nextRelease, logger: t.context.logger});

  // Verify the files that have been commited
  t.deepEqual(await gitCommitedFiles('HEAD', {cwd, env}), []);
});
