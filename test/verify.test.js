import test from "ava";
import verify from "../lib/verify.js";

test('Throw SemanticReleaseError if "assets" option is not a String or false or an Array of Objects', (t) => {
  const assets = true;
  const [error] = t.throws(() => verify({ assets }));

  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSETS");
});

test('Throw SemanticReleaseError if "assets" option is not an Array with invalid elements', (t) => {
  const assets = ["file.js", 42];
  const [error] = t.throws(() => verify({ assets }));

  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSETS");
});

test('Verify "assets" is a String', (t) => {
  const assets = "file2.js";

  t.notThrows(() => verify({ assets }));
});

test('Verify "assets" is an Array of String', (t) => {
  const assets = ["file1.js", "file2.js"];

  t.notThrows(() => verify({ assets }));
});

test('Verify "assets" is an Object with a path property', (t) => {
  const assets = { path: "file2.js" };

  t.notThrows(() => verify({ assets }));
});

test('Verify "assets" is an Array of Object with a path property', (t) => {
  const assets = [{ path: "file1.js" }, { path: "file2.js" }];

  t.notThrows(() => verify({ assets }));
});

test('Verify disabled "assets" (set to false)', (t) => {
  const assets = false;

  t.notThrows(() => verify({ assets }));
});

test('Verify "assets" is an Array of glob Arrays', (t) => {
  const assets = [["dist/**", "!**/*.js"], "file2.js"];

  t.notThrows(() => verify({ assets }));
});

test('Verify "assets" is an Array of Object with a glob Arrays in path property', (t) => {
  const assets = [{ path: ["dist/**", "!**/*.js"] }, { path: "file2.js" }];

  t.notThrows(() => verify({ assets }));
});

test('Throw SemanticReleaseError if "message" option is not a String', (t) => {
  const message = 42;
  const [error] = t.throws(() => verify({ message }));

  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDMESSAGE");
});

test('Throw SemanticReleaseError if "message" option is an empty String', (t) => {
  const message = "";
  const [error] = t.throws(() => verify({ message }));

  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDMESSAGE");
});

test('Throw SemanticReleaseError if "message" option is a whitespace String', (t) => {
  const message = "  \n \r ";
  const [error] = t.throws(() => verify({ message }));

  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDMESSAGE");
});

test('Verify undefined "message" and "assets"', (t) => {
  t.notThrows(() => verify({}));
});
