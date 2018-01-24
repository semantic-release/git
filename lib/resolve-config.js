const {castArray} = require('lodash');

module.exports = ({message, assets}) => ({
  gitUserName: process.env.GIT_USERNAME || 'semantic-release-bot',
  gitUserEmail: process.env.GIT_EMAIL || 'semantic-release-bot@martynus.net',
  message,
  assets: assets ? castArray(assets) : assets,
});
