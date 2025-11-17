const {isNil, castArray} = require('lodash');

module.exports = ({assets, message, push_remote}) => ({
  assets: isNil(assets)
    ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    : assets
    ? castArray(assets)
    : assets,
  message,
  push_remote: isNil(push_remote)
    ? true
    : push_remote
});
