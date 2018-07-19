const path = require('path');
const {isPlainObject, castArray, uniq} = require('lodash');
const dirGlob = require('dir-glob');
const globby = require('globby');
const debug = require('debug')('semantic-release:github');

const filesTransform = (files, cwd, transform) =>
  files.map(file => `${file.startsWith('!') ? '!' : ''}${transform(cwd, file.startsWith('!') ? file.slice(1) : file)}`);

module.exports = async ({cwd}, assets) =>
  uniq(
    [].concat(
      ...(await Promise.all(
        assets.map(async asset => {
          // Wrap single glob definition in Array
          let glob = castArray(isPlainObject(asset) ? asset.path : asset);
          // TODO Temporary workaround for https://github.com/kevva/dir-glob/issues/7 and https://github.com/mrmlnc/fast-glob/issues/47
          glob = uniq([
            ...filesTransform(await dirGlob(filesTransform(glob, cwd, path.resolve)), cwd, path.relative),
            ...glob,
          ]);

          // Skip solo negated pattern (avoid to include every non js file with `!**/*.js`)
          if (glob.length <= 1 && glob[0].startsWith('!')) {
            debug(
              'skipping the negated glob %o as its alone in its group and would retrieve a large amount of files',
              glob[0]
            );
            return [];
          }

          const globbed = await globby(glob, {
            cwd,
            expandDirectories: true,
            gitignore: false,
            dot: true,
            onlyFiles: false,
          });

          return globbed.length > 0 ? globbed : [];
        })
      ))
    )
  );
