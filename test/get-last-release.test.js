import test from 'ava';
import {stub} from 'sinon';
import getLastRelease from '../lib/get-last-release';
import {gitRepo, gitCommit, gitTagVersion, gitShallowClone} from './helpers/git-utils';

test.beforeEach(t => {
  // Save the current working diretory
  t.context.cwd = process.cwd();
  // Stub the logger functions
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
});

test.afterEach.always(t => {
  // Restore the current working directory
  process.chdir(t.context.cwd);
});

test.serial('Get the highest valid tag', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Create some commits and tags
  await gitCommit('First');
  await gitTagVersion('foo');
  await gitCommit('Second');
  await gitTagVersion('v2.0.0');
  await gitCommit('Third');
  await gitTagVersion('v1.0.0');
  await gitCommit('Fourth');
  await gitTagVersion('v3.0');

  t.deepEqual(await getLastRelease(t.context.logger), {gitHead: 'v2.0.0', version: '2.0.0'});
  t.true(t.context.log.calledWith('Found git tag version %s', 'v2.0.0'));
});

test.serial('Return "undefined" if no valid tag is found', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  await gitRepo();
  // Create some commits and tags
  await gitCommit('First');
  await gitTagVersion('foo');
  await gitCommit('Second');
  await gitTagVersion('v2.0.x');
  await gitCommit('Third');
  await gitTagVersion('v3.0');

  t.falsy(await getLastRelease(t.context.logger));
  t.true(t.context.log.calledWith('No git tag version found'));
});

test.serial('Retrieve tags even if not included in the shallow clone', async t => {
  // Create a git repository, set the current working directory at the root of the repo
  const repo = await gitRepo();
  // Create some commits and tag
  await gitCommit('First');
  await gitTagVersion('v2.0.0');
  await gitCommit('Second');
  await gitTagVersion('v1.0.0');
  // Create a shallow clone with only 1 commit (ommiting the commit with the tag v2.0.0)
  await gitShallowClone(repo);

  t.deepEqual(await getLastRelease(t.context.logger), {gitHead: 'v2.0.0', version: '2.0.0'});
  t.true(t.context.log.calledWith('Found git tag version %s', 'v2.0.0'));
});
