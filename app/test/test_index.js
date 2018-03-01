const {test} = require('ava');
const {
    generatePayload,
    getConfigs,
    connect,
    fetchPages,
} = require('../index');
const {withEnvParam} = require('./helpers/withEnv');
const {airtable, slack} = getConfigs({});
// update basekey to point to temporary test key
airtable.baseKey = 'appy3yLRvrVArKmhJ';

test('message is formatted correctly', t => {
    const str = generatePayload(slack, 'DATA_TST')
    t.is(str.indexOf('DATA_TST') > -1, true)
})


test('message newlines are respected', t => {
    const test_slack = Object.assign({}, slack);
    test_slack.template = '\\n foobar'
    const str = generatePayload(slack, 'DATA_TST')
    t.is(str.indexOf('\n') > -1, true)
})

test('apiKey, conf must be passed in to connect', t => {
    const a = connect(null, null);
    t.is(a, null)

    const b = connect('foo', null);
    t.is(b, null)

    const c = connect(null, 'bar');
    t.is(c, null)
});

withEnvParam('AIRTABLE_TEST_API_KEY', 'return valid query object from airtable', t => {
    const a = connect(process.env.AIRTABLE_TEST_API_KEY, airtable);
    // gross af but works for now
    t.is(a.constructor.name, 'Class')
});

test('apikey, conf must be passed in to fetchPages', t => fetchPages(null, null)
    .catch(e => {
        t.is(e, 'Missing required params')
    }));

withEnvParam('AIRTABLE_TEST_API_KEY', 'throw error if record is not found', t => fetchPages(connect(process.env.AIRTABLE_TEST_API_KEY, airtable), airtable)
    .catch(e => {
        t.is(e.message, 'No record found')
    }));
