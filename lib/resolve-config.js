import { isNil, castArray } from 'lodash';

export default function resolveConfig ({assets, message}) {
  return {
    assets: isNil(assets)
      ? ['CHANGELOG.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']
      : assets
      ? castArray(assets)
      : assets,
    message,
  }
};
