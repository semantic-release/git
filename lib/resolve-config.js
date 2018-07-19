const {isUndefined, castArray} = require('lodash');

module.exports = ({assets, message}) => ({
  assets: isUndefined(assets)
    ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    : assets
      ? castArray(assets)
      : assets,
  message,
});
