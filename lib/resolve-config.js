const {castArray} = require('lodash');

module.exports = ({message, assets, githubToken}) => ({
  gitCredentials: process.env.GIT_CREDENTIALS || githubToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
  gitUserName: process.env.GIT_USERNAME || 'semantic-release-bot',
  gitUserEmail: process.env.GIT_EMAIL || 'semantic-release-bot@martynus.net',
  message,
  assets: assets ? castArray(assets) : assets,
});
