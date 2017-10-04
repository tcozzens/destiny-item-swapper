/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';

const Alexa = require('alexa-sdk');
var request = require('request');

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).
const API_KEY = '461360109a974a24a9f07e54653a5001';

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Destiny Item Swapper',
            GET_FACT_MESSAGE: "Hang on a second...",
            STOP_MESSAGE: 'Goodbye!',
            HELP_MESSAGE: 'You can say tell me a space fact, or, you can say exit... What can I help you with?',
            HELP_REPROMPT: 'What can I help you with?',
            TUCKER_TEST: 'tuckers test',
            BETTER_GEAR: 'HAHAHA! Is this a joke? Clearly dj dipmode is an r. n. g. god.'
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetItem');
    },
    'GetNewFactIntent': function () {
        this.emit('GetItem');
    },
    'TuckerTest': function () {
        // const speechOutput = this.t('TUCKER_TEST');
        // this.emit(':tellWithCard', speechOutput, this.t('SKILL_NAME'));
        var urlForMembership = 'https://bungie.net/Platform/User/SearchUsers/?q=alltuckerdout';
        let options = { url: urlForMembership, headers: {'X-API-Key': API_KEY}}
        let membership = request.get(options);
        let membershipId = membership.membershipId;
        if (this.event.session.user.accessToken == undefined) {
            this.emit(':tellWithLinkAccountCard',
                'your id is ' + membershipId);
            return;
        }
        else {
            this.emit(':tellWithLinkAccountCard',
            'you are authenticated');
        return;
        }
    },
    'BetterGear': function () {
        const speechOutput = this.t('BETTER_GEAR');
        this.emit(':tellWithCard', speechOutput, this.t('SKILL_NAME'));
        // if (this.event.session.user.accessToken == undefined) {
        //     this.emit(':tellWithLinkAccountCard',
        //         'to start using this skill, please use the companion app to authenticate on Amazon');
        //     return;
        // }
    },
    'GetItem': function () {
        const speechOutput = this.t('GET_FACT_MESSAGE');
        this.emit(':tellWithCard', speechOutput, this.t('SKILL_NAME'));
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'Unhandled': function () {
        this.emit(':ask', 'HELP_MESSAGE', 'HELP_MESSAGE');
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
