const {castArray} = require('lodash');

module.exports = ({message, assets}) => ({message, assets: assets ? castArray(assets) : assets});
