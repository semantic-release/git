import { homepage as _homepage } from '../../package.json';

const [homepage] = _homepage.split('#');
const linkify = (file) => `${homepage}/blob/master/${file}`;

export function EINVALIDASSETS({ assets }) {
  return ({
    message: 'Invalid `assets` option.',
    details: `The [assets option](${linkify(
      'README.md#assets'
    )}) option must be an \`Array\` of \`Strings\` or \`Objects\` with a \`path\` property.

Your configuration for the \`assets\` option is \`${assets}\`.`,
  });
}

export function EINVALIDMESSAGE({ message }) {
  return ({
    message: 'Invalid `message` option.',
    details: `The [message option](${linkify('README.md#message')}) option, if defined, must be a non empty \`String\`.

Your configuration for the \`successComment\` option is \`${message}\`.`,
  });
}
