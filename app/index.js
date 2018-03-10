// npm modules
const moment = require('moment');
const request = require('superagent');

// generate string payload for slack
const generatePayload = (conf, data) => {
    const {users,template,mentionSep} = conf;
    const mentions = users.map(user => `<@${user}>`).join(mentionSep || ' or ');
    const tform = template
        .replace(/\\n/g, '\n')
        .replace(/\$DATA/g, data)
        .replace(/\$MENTIONS/g, mentions);
    return tform;
}

// make call to slack
const postToSlack = (webhook=null, payload='') => new Promise((resolve, reject) => request
    .post(webhook)
    .send({
        text: payload,
        mrkdwn: true,
    })
    .end((err, res) => {
        if (err) reject(err)
        else resolve(res)
    }));

const getReq = (url, args={}) => new Promise((resolve, reject) => request
    .get(url)
    .query(args)
    .end((err, res) => {
        if (err) reject(err)
        else resolve(res)
    }));

const getChannelsCreatedToday = channels => channels.filter(channel => moment().diff(moment(channel.created*1000), 'days') == 0)
const getChannelsWithName = (channels, name='lecture') => channels.filter(channel => channel.name.indexOf(name) > -1)
const getMemberPresence = (channels, url, args={}) => Promise.all(channels.reduce((members, channel) => {
    const memberPresence = channel.members.map(member => getReq(url, Object.assign({}, args, { user: member, }))
        .then(res => ({member, presence: res.body,})))
    return members.concat(memberPresence)
}, []))


// lib
const getConfigs = (secrets = {}) => ({
    slack: {
        api_token: secrets.SLACK_USER_TOKEN,
        webhook: secrets.SLACK_WEBHOOK,
        days: (secrets.BOT_DAY || '').split(','),
        channels_list: 'https://slack.com/api/channels.list',
        user_presence: 'https://slack.com/api/users.getPresence',
    },
})

const determineRunnable = slack => {
    const now = moment().subtract(5, 'hours');
    return slack.days.reduce((bool, day) => {
        if (bool) return true;
        if (now.format('dddd').toLowerCase() === day) bool = true;
        return bool;
    }, false);
}

// webtask context execution
const runTask = (context, cb) => {
    const {slack} = getConfigs(context.secrets);
    if (!determineRunnable(slack)) {
        cb(null, {e: `${moment().format('dddd')} is not a runnable day`})
        return;
    }

    getReq(slack.channels_list, { token: slack.api_token,})
        .then(res => getChannelsCreatedToday(res.body.channels))
        .then(channels => getChannelsWithName(channels))
        .then(channels => {
            return Promise.all(channels.map(channel => {
                return postToSlack(slack.webhook, `------ *Querying for attendance* against *<#${channel.id}>* ------`);
            })).then(_ => {
                return channels;
            })
        })
        .then(channels => getMemberPresence(channels, slack.user_presence, { token: slack.api_token }))
        .then(args => Promise.all(args.map(arg => {
            const presence = arg.presence.presence;
            const isPresent = presence === 'active';
            const emoji = isPresent ? ':white_check_mark:' : ':x:';
            const payload = `${emoji} <@${arg.member}> is ${isPresent ? 'present' : 'present but NOT active'} on ${moment().subtract(5, 'hours').format('MMMM Do YYYY, h:mm a')}`
            return postToSlack(slack.webhook, payload);
        })))
        .then(_ => {
            cb(null, {});
        })
}

// gross but necessary evil because webtask seems to
// not support linking to local dependencies...
const exportables = {
    runTask,
    getConfigs,
    generatePayload,
    postToSlack,
    getReq,
    getChannelsCreatedToday,
    getChannelsWithName,
    getMemberPresence,
    determineRunnable,
};

if (process.env.TRAVIS_TEST_ENV) {
    module.exports = exportables;
}
else {
    module.exports = runTask;
}
