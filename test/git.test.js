import path from 'path';
import test from 'ava';
import {outputFile, appendFile} from 'fs-extra';
import {add, getModifiedFiles, commit, gitHead, push} from '../lib/git';
import {gitRepo, gitCommits, gitGetCommits, gitStaged, gitRemoteHead} from './helpers/git-utils';

test('Add file to index', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();
  // Create files
  await outputFile(path.resolve(cwd, 'file1.js'), '');
  // Add files and commit
  await add(['.'], {cwd});

  await t.deepEqual(await gitStaged({cwd}), ['file1.js']);
});

test('Get the modified files, including files in .gitignore but including untracked ones', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();
  // Create files
  await outputFile(path.resolve(cwd, 'file1.js'), '');
  await outputFile(path.resolve(cwd, 'dir/file2.js'), '');
  await outputFile(path.resolve(cwd, 'file3.js'), '');
  // Create .gitignore to ignore file3.js
  await outputFile(path.resolve(cwd, '.gitignore'), 'file.3.js');
  // Add files and commit
  await add(['.'], {cwd});
  await commit('Test commit', {cwd});
  // Update file1.js, dir/file2.js and file3.js
  await appendFile(path.resolve(cwd, 'file1.js'), 'Test content');
  await appendFile(path.resolve(cwd, 'dir/file2.js'), 'Test content');
  await appendFile(path.resolve(cwd, 'file3.js'), 'Test content');
  // Add untracked file
  await outputFile(path.resolve(cwd, 'file4.js'), 'Test content');

  await t.deepEqual(
    (await getModifiedFiles({cwd})).sort(),
    ['file4.js', 'file3.js', 'dir/file2.js', 'file1.js'].sort()
  );
});

test('Returns [] if there is no modified files', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();

  await t.deepEqual(await getModifiedFiles({cwd}), []);
});

test('Commit added files', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();
  // Create files
  await outputFile(path.resolve(cwd, 'file1.js'), '');
  // Add files and commit
  await add(['.'], {cwd});
  await commit('Test commit', {cwd});

  await t.true((await gitGetCommits(undefined, {cwd})).length === 1);
});

test('Get the last commit sha', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();
  // Add commits to the master branch
  const [{hash}] = await gitCommits(['First'], {cwd});

  const result = await gitHead({cwd});

  t.is(result, hash);
});

test('Throw error if the last commit sha cannot be found', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const {cwd} = await gitRepo();

  await t.throws(gitHead({cwd}));
});

test('Push commit to remote repository', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  const {cwd, repositoryUrl} = await gitRepo(true);
  const [{hash}] = await gitCommits(['Test commit'], {cwd});

  await push(repositoryUrl, 'master', {cwd});

  t.is(await gitRemoteHead(repositoryUrl), hash, {cwd});
});
