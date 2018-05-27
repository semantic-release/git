const url = require('url');
const pkg = require('../../package.json');

const homepage = url.format({...url.parse(pkg.homepage), ...{hash: null}});
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
	EINVALIDMERGEBRANCH: branch => ({
		message: 'Invalid `branchMerges` option.',
		details: `Could not verify the branch ${branch} on the remote repository.`,
	}),
};
