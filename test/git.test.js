import test from 'ava';
import {outputFile, appendFile} from 'fs-extra';
import tempy from 'tempy';
import {unshallow, gitTags, add, getModifiedFiles, config, commit, tag, gitHead, deleteHeadTag, push} from '../lib/git';
import {
  gitRepo,
  gitCommit,
  gitShallowClone,
  gitGetCommit,
  gitGetConfig,
  gitCommitTag,
  gitStaged,
  gitRemoteTagHead,
} from './helpers/git-utils';

// Save the current working diretory
const cwd = process.cwd();

test.afterEach.always(() => {
  // Restore the current working directory
  process.chdir(cwd);
});

test.serial('Unshallow repository', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const repo = await gitRepo();
  // Add commits to the master branch
  await gitCommit('First');
  await gitCommit('Second');
  // Create a shallow clone with only 1 commit
  await gitShallowClone(repo);

  // Verify the shallow clone contains only one commit
  t.is((await gitGetCommit('')).length, 1);

  await unshallow();

  // Verify the shallow clone contains all the commits
  t.is((await gitGetCommit('')).length, 2);
});

test.serial('Do not throw error when unshallow a complete repository', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Add commits to the master branch
  await gitCommit('First');
  await t.notThrows(unshallow());
});

test.serial('Throws error if obtaining the tags fails', async t => {
  const dir = tempy.directory();
  process.chdir(dir);

  await t.throws(gitTags());
});

test.serial('Add file to index', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Create files
  await outputFile('file1.js', '');
  // Add files and commit
  await add(['.']);

  await t.deepEqual(await gitStaged(), ['file1.js']);
});

test.serial('Get the modified files, ignoring files in .gitignore but including untracked ones', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Create files
  await outputFile('file1.js', '');
  await outputFile('dir/file2.js', '');
  await outputFile('file3.js', '');
  // Create .gitignore to ignore file3.js
  await outputFile('.gitignore', 'file.3.js');
  // Add files and commit
  await add(['.']);
  await commit('Test commit');
  // Update file1.js and dir/file2.js
  await appendFile('file1.js', 'Test content');
  await appendFile('dir/file2.js', 'Test content');
  // Add untracked file
  await outputFile('file4.js', 'Test content');

  await t.deepEqual(await getModifiedFiles(), ['file4.js', 'dir/file2.js', 'file1.js']);
});

test.serial('Returns [] if there is no modified files', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();

  await t.deepEqual(await getModifiedFiles(), []);
});

test.serial('Set git config', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Add config
  await config('user.name', 'username');

  await t.is(await gitGetConfig('user.name'), 'username');
});

test.serial('Commit added files', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Create files
  await outputFile('file1.js', '');
  // Add files and commit
  await add(['.']);
  await commit('Test commit');

  await t.true((await gitGetCommit('')).length === 1);
});

test.serial('Add tag on head commit', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  const {hash} = await gitCommit('Test commit');

  await tag('tag_name');

  await t.is(await gitCommitTag(hash), 'tag_name');
});

test.serial('Get the last commit sha', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Add commits to the master branch
  const {hash} = await gitCommit('First');

  const result = await gitHead();

  t.is(result.substring(0, 7), hash);
});

test.serial('Throw error if the last commit sha cannot be found', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();

  await t.throws(gitHead());
});

test.serial('Push tag and commit to remote repository', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  const repo = await gitRepo(true);
  const {hash} = await gitCommit('Test commit');
  await tag('tag_name');

  await push(repo, 'master');

  t.is((await gitRemoteTagHead(repo, 'tag_name')).substring(0, 7), hash);
});

test.serial('If push fails returns and Error without reference to the repository URL', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  await gitRepo(true);
  await gitCommit('Test commit');
  await tag('tag_name');

  const error = await t.throws(push('http://wrongurl.com/repo.git', 'master'), Error);
  t.is(error.message, 'An error occured during the git push to the remote branch master');
});

test.serial('Delete local and remote tag if they reference the local HEAD', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  const repo = await gitRepo(true);
  await gitCommit('Test commit');
  await tag('tag_name');
  await push(repo, 'master');

  await deleteHeadTag(repo, 'tag_name');

  t.deepEqual(await gitTags(), []);
  t.falsy(await gitRemoteTagHead(repo, 'tag_name'));
});

test.serial('Do not throw error if the tag to delete does not exists', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  const repo = await gitRepo(true);
  await gitCommit('Test commit');

  await t.notThrows(deleteHeadTag(repo, 'tag_name'));
  t.deepEqual(await gitTags(), []);
  t.falsy(await gitRemoteTagHead(repo, 'tag_name'));
});

test.serial('Throw a SemanticReleaseError if the tag to delete exists and reference a different sha', async t => {
  // Create a git repository with a remote, set the current working directory at the root of the repo
  const repo = await gitRepo(true);
  await gitCommit('Commit with tag');
  await tag('tag_name');
  await gitCommit('Commit without tag');
  await push(repo, 'master');

  const error = await t.throws(deleteHeadTag(repo, 'tag_name'));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EGITTAGEXIST');
});
