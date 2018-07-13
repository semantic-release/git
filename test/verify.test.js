import test from 'ava';
import verify from '../lib/verify';

test('Throw SemanticReleaseError if "assets" option is not a String or false or an Array of Objects', async t => {
  const assets = true;
  const [error] = await t.throws(verify({assets}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDASSETS');
});

test('Throw SemanticReleaseError if "assets" option is not an Array with invalid elements', async t => {
  const assets = ['file.js', 42];
  const [error] = await t.throws(verify({assets}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDASSETS');
});

test('Verify "assets" is a String', async t => {
  const assets = 'file2.js';

  await t.notThrows(verify({assets}));
});

test('Verify "assets" is an Array of String', async t => {
  const assets = ['file1.js', 'file2.js'];

  await t.notThrows(verify({assets}));
});

test('Verify "assets" is an Object with a path property', async t => {
  const assets = {path: 'file2.js'};

  await t.notThrows(verify({assets}));
});

test('Verify "assets" is an Array of Object with a path property', async t => {
  const assets = [{path: 'file1.js'}, {path: 'file2.js'}];

  await t.notThrows(verify({assets}));
});

test('Verify disabled "assets" (set to false)', async t => {
  const assets = false;

  await t.notThrows(verify({assets}));
});

test('Verify "assets" is an Array of glob Arrays', async t => {
  const assets = [['dist/**', '!**/*.js'], 'file2.js'];

  await t.notThrows(verify({assets}));
});

test('Verify "assets" is an Array of Object with a glob Arrays in path property', async t => {
  const assets = [{path: ['dist/**', '!**/*.js']}, {path: 'file2.js'}];

  await t.notThrows(verify({assets}));
});

test('Throw SemanticReleaseError if "message" option is not a String', async t => {
  const message = 42;
  const [error] = await t.throws(verify({message}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if "message" option is an empty String', async t => {
  const message = '';
  const [error] = await t.throws(verify({message}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDMESSAGE');
});

test('Throw SemanticReleaseError if "message" option is a whitespace String', async t => {
  const message = '  \n \r ';
  const [error] = await t.throws(verify({message}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDMESSAGE');
});

test('Verify undefined "message" and "assets"', async t => {
  await t.notThrows(verify({}));
});
