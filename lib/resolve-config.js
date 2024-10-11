import { isNil, castArray } from 'lodash-es';

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
