const {castArray} = require('lodash');

module.exports = ({assets, message}) => ({assets: assets ? castArray(assets) : assets, message});
