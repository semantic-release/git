const pkg = require('../../package.json');

const [homepage] = pkg.homepage.split('#');
const linkify = file => `${homepage}/blob/master/${file}`;

module.exports = {
  EINVALIDASSETS: ({assets}) => ({
    message: 'Invalid `assets` option.',
    details: `The [assets option](${linkify(
      'README.md#assets'
    )}) option must be an \`Array\` of \`Strings\` or \`Objects\` with a \`path\` property.

Your configuration for the \`assets\` option is \`${assets}\`.`,
  }),
  EINVALIDMESSAGE: ({message}) => ({
    message: 'Invalid `message` option.',
    details: `The [message option](${linkify('README.md#message')}) option, if defined, must be a non empty \`String\`.

Your configuration for the \`message\` option is \`${message}\`.`,
  }),
  EINVALIDPREPUSHCMD: ({prePushCmd}) => ({
    message: 'Invalid `prePushCmd` option.',
    details: `The [prePushCmd option](${linkify(
      'README.md#prePushCmd'
    )}) option, if defined, must be a non empty \`String\` or \`false\` to disable it.

Your configuration for the \`prePushCmd\` option is \`${prePushCmd}\`.`,
  }),
};
