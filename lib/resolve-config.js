const {isNil, castArray} = require('lodash');

module.exports = ({assets, message, enablePush}) => ({
  assets: isNil(assets)
    ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    : assets
    ? castArray(assets)
    : assets,
  message,
  enablePush: isNil(enablePush) ? true : enablePush,
});
