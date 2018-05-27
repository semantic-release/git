const {castArray} = require('lodash');

const defaultMessage = 'chore: create new release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'; // eslint-disable-line no-template-curly-in-string
const defaultAssets = ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json'];
const defaultBranchName = 'release/${nextRelease.version}'; // eslint-disable-line no-template-curly-in-string

module.exports = ({message, assets, branch, branchName, branchPush, branchMerges}) => ({
	message: message ? message : defaultMessage,
	assets: assets ? castArray(assets) : defaultAssets,
	branchName: branchName ? branchName : defaultBranchName,
	branchPush: Boolean(branchPush),
	branchMerges: branchMerges ? castArray(branchMerges) : [branch],
});
