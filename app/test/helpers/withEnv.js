const {test} = require('ava');
const withEnvParam = (name, msg, cb) => process.env[name] ? test(msg, cb) : test.skip(msg, cb);

module.exports = {
    withEnvParam,
}
