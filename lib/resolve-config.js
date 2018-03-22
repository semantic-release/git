const {castArray} = require('lodash');

const DEFAULT_NAME = 'semantic-release-bot';
const DEFAULT_EMAIL = 'semantic-release-bot@martynus.net';

module.exports = ({message, assets}, logger) => {
  if (process.env.GIT_USERNAME || process.env.GIT_EMAIL) {
    logger.log(
      [
        '[Deprecation] GIT_USERNAME and GIT_EMAIL are obsolete,',
        'please use GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, GIT_COMMITTER_NAME and',
        'GIT_COMMITTER_EMAIL envorinment variables to set commit author.',
        'See %s for more details.',
      ].join(' '),
      'https://git-scm.com/book/gr/v2/Git-Internals-Environment-Variables'
    );
    const name = process.env.GIT_USERNAME || DEFAULT_NAME;
    const email = process.env.GIT_EMAIL || DEFAULT_EMAIL;
    process.env.GIT_AUTHOR_NAME = name;
    process.env.GIT_AUTHOR_EMAIL = email;
    process.env.GIT_COMMITTER_NAME = name;
    process.env.GIT_COMMITTER_EMAIL = email;
  }
  return {
    message,
    assets: assets ? castArray(assets) : assets,
  };
};
