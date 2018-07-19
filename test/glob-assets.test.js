import path from 'path';
import test from 'ava';
import {copy, ensureDir} from 'fs-extra';
import tempy from 'tempy';
import globAssets from '../lib/glob-assets';

const fixtures = 'test/fixtures/files';

test('Retrieve file from single path', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['upload.txt']);

  t.deepEqual(globbedAssets, ['upload.txt']);
});

test('Retrieve multiple files from path', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['upload.txt', 'upload_other.txt']);

  t.deepEqual(globbedAssets.sort(), ['upload_other.txt', 'upload.txt'].sort());
});

test('Retrieve multiple files from Object', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [
    {path: 'upload.txt', name: 'upload_name', label: 'Upload label'},
    'upload_other.txt',
  ]);

  t.deepEqual(globbedAssets.sort(), ['upload.txt', 'upload_other.txt'].sort());
});

test('Retrieve multiple files without duplicates', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [
    'upload_other.txt',
    'upload.txt',
    'upload_other.txt',
    'upload.txt',
    'upload.txt',
    'upload_other.txt',
  ]);

  t.deepEqual(globbedAssets.sort(), ['upload_other.txt', 'upload.txt'].sort());
});

test('Retrieve file from single glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['upload.*']);

  t.deepEqual(globbedAssets, ['upload.txt']);
});

test('Retrieve multiple files from single glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['*.txt']);

  t.deepEqual(globbedAssets.sort(), ['upload_other.txt', 'upload.txt'].sort());
});

test('Accept glob array with one value', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [['*load.txt'], ['*_other.txt']]);

  t.deepEqual(globbedAssets.sort(), ['upload_other.txt', 'upload.txt'].sort());
});

test('Exclude globs that resolve to no files', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [['upload.txt', '!upload.txt']]);

  t.deepEqual(globbedAssets, []);
});

test('Accept glob array with one value for missing files', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [['*missing.txt'], ['*_other.txt']]);

  t.deepEqual(globbedAssets.sort(), ['upload_other.txt'].sort());
});

test('Include dotfiles', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['.dot*']);

  t.deepEqual(globbedAssets, ['.dotfile']);
});

test('Ingnore single negated glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, ['!*.txt']);

  t.deepEqual(globbedAssets, []);
});

test('Ingnore single negated glob in Object', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [{path: '!*.txt'}]);

  t.deepEqual(globbedAssets, []);
});

test('Accept negated globs', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({cwd}, [['*.txt', '!**/*_other.txt']]);

  t.deepEqual(globbedAssets, ['upload.txt']);
});

test('Expand directories', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, path.resolve(cwd, 'dir'));
  const globbedAssets = await globAssets({cwd}, [['dir']]);

  t.deepEqual(globbedAssets.sort(), ['dir', 'dir/upload_other.txt', 'dir/upload.txt', 'dir/.dotfile'].sort());
});

test('Include empty directory as defined', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  await ensureDir(path.resolve(cwd, 'empty'));
  const globbedAssets = await globAssets({cwd}, [['empty']]);

  t.deepEqual(globbedAssets, ['empty']);
});
