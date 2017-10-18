var request = require('request');

exports.handler = function (event, context) {
  try {
    // eslint-disable-next-line no-console
    console.log('event.session.application.applicationId=' + event.session.application.applicationId);

    if (event.request.type === 'IntentRequest') {
      onIntent(event.request,
        event.session,
        function callback(sessionAttributes, speechletResponse) {
          context.succeed(buildResponse(sessionAttributes, speechletResponse));
        });
    }
  } catch (e) {
    context.fail('Exception: ' + e);
  }
};

function onIntent(intentRequest, session, callback) {

  var intent = intentRequest.intent;
  var intentName = intentRequest.intent.name;

  // dispatch custom intents to handlers here

  if (intentName == 'GetHoursPlayed') {
    handleGetHoursPlayed(intent, session, callback);
  }
  else {
    throw 'Invalid intent';

  }
}


// ------- Skill specific logic -------


function handleGetHoursPlayed(intent, session, callback) {
  getCurrentUserJSON(session)
    .then(getCharacters) //bc of the then, the user is automatically passed.
    .then(buildGetHoursPlayedResponse)
    .then(output => {
      callback(session.attributes, buildSpeechletResponseWithoutCard(output, '', true));
    });
}

function getUserData(session) {
  return {
    url: 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/',
    headers: {
      'X-API-Key': '461360109a974a24a9f07e54653a5001',
      'authorization': 'bearer ' + session.user.accessToken
    }
  };
}

const getCurrentUserJSON = session => new Promise((resolve, reject) => {
  request.get(getUserData(session), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.Response) {
        resolve(result.Response);
      }
    } catch (e) {
      reject(error);
    }
  });
});

const getCharacters = response => new Promise((resolve, reject) => {
  request.get(getCharacterData(response.destinyMemberships[0].membershipId), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.Response) {
        resolve(result.Response);
      }
    } catch (e) {
      reject(error);
    }
  });
});

function getCharacterData(currentUserMembershipId) {
  return {
    url: 'https://www.bungie.net/Platform/Destiny2/1/Profile/' + currentUserMembershipId + '?components=200',
    headers: {
      'X-API-Key': '461360109a974a24a9f07e54653a5001',
    }
  };
}

function buildGetHoursPlayedResponse(response) {
  let speechOutput = '';

  if (response !== 'ERROR') {
    if (response && response.characters) {
      const characters = response.characters.data;

      for (var character in characters) {
        const characterValues = characters[character];
        let hoursPlayed = Math.ceil(characterValues.minutesPlayedTotal / 60);
        switch (characterValues.classType) {
        case 0:
          speechOutput = speechOutput + 'Your titan has ' + hoursPlayed + ' hours played. ';
          break;
        case 1:
          speechOutput = speechOutput + 'Your hunter has ' + hoursPlayed + ' hours played. ';
          break;
        case 2:
          speechOutput = speechOutput + 'Your warlock has ' + hoursPlayed + ' hours played. ';
          break;
        }
      }
    }
    else {
      speechOutput = 'Sorry, couldn\'t find your membership. Have you linked your account?';
    }
  } else {
    speechOutput = 'Sorry, couldn\'t find your membership. Have you linked your account?';
  }
  return speechOutput;
}


// ------- Helper functions to build responses for Alexa -------


function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText
      }
    },
    shouldEndSession: shouldEndSession
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  };
}