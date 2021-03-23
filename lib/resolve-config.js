const {isNil, castArray} = require('lodash');
const skipCiOptions = ['message', 'pushOption', false];
const skipCiDefaultOption = 'message';

module.exports = ({assets, message, skipCi}) => ({
  assets: isNil(assets)
    ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    : assets
    ? castArray(assets)
    : assets,
  message,
  skipCi: skipCiOptions.includes(skipCi) ? skipCi : skipCiDefaultOption,
});
