import { isNil, castArray } from "lodash";

export default ({ assets, message }) => ({
  assets: isNil(assets)
    ? ["CHANGELOG.md", "package.json", "package-lock.json", "npm-shrinkwrap.json"]
    : assets
    ? castArray(assets)
    : assets,
  message,
});
