import test from 'ava';
import {stub} from 'sinon';
import publish from '../lib/publish';
import {gitRepo} from './helpers/git-utils';

test.beforeEach(t => {
  // Stub the logger functions
  t.context.log = stub();
  t.context.logger = {log: t.context.log};
});

test("Skip push if pushStep is not 'publish'", async t => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {};
  const options = {repositoryUrl, branch: 'master'};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await publish(pluginConfig, {cwd, env, options, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(t.context.log.args, []);
});

test("Push if pushStep is 'publish'", async t => {
  const {cwd, repositoryUrl} = await gitRepo(true);
  const pluginConfig = {pushStep: 'publish'};
  const options = {repositoryUrl, branch: 'master'};
  const env = {};
  const lastRelease = {};
  const nextRelease = {version: '2.0.0', gitTag: 'v2.0.0', notes: 'Test release note'};

  await publish(pluginConfig, {cwd, env, options, lastRelease, nextRelease, logger: t.context.logger});

  t.deepEqual(t.context.log.args[0], ['Published Git commit for: %s', 'v2.0.0']);
});
