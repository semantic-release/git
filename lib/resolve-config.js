const {isNil, castArray, defaultTo} = require('lodash');

module.exports = ({assets, message, pushStep}) => ({
  assets: isNil(assets)
    ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    : assets
    ? castArray(assets)
    : assets,
  message,
  pushStep: defaultTo(pushStep, 'prepare'),
});
