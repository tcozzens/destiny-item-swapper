var request = require("request")

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here

    if (intentName == "GetHoursPlayed") {
        handleGetHoursPlayed(intent, session, callback)
    }
    else {
        throw "Invalid intent"

    }
}

function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------


function handleGetHoursPlayed(intent, session, callback) {
    var speechOutput = "Start";

    getCurrentUserJSON(session)
        .then(getCharacters) //bc of the then, the user is automatically passed.
        .then(response => {
            if (response !== "ERROR") {
                if (response && response.characters) {
                    var characters = response.characters.data
                    speechOutput = "";

                    for (var character in characters) {
                        const characterValues = characters[character];
                        let hoursPlayed = Math.ceil(characterValues.minutesPlayedTotal / 60);
                        switch (characterValues.classType) {
                            case 0:
                                speechOutput = speechOutput + "Your titan has " + hoursPlayed + " hours played. ";
                                break;
                            case 1:
                                speechOutput = speechOutput + "Your hunter has " + hoursPlayed + " hours played. ";
                                break;
                            case 2:
                                speechOutput = speechOutput + "Your warlock has " + hoursPlayed + " hours played. ";
                                break;
                        }
                    }
                }
                else {
                    speechOutput = "Sorry, couldn't find your membership."
                }
            } else {
                speechOutput = "I guess an error?"
            }
            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
        })
}

function getUserData(session) {
    return {
        url: "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
        headers: {
            'X-API-Key': '461360109a974a24a9f07e54653a5001',
            'authorization': "bearer " + session.user.accessToken
        }
    }
}

const getCurrentUserJSON = session => new Promise((resolve, reject) => {
    request.get(getUserData(session), function (error, response, body) {
        var result
        try {
            result = JSON.parse(body)

            if (result && result.Response) {
                resolve(result.Response)
            }
        } catch (e) {
            reject(error)
        }
    })
})

const getCharacters = response => new Promise((resolve, reject) => {
    request.get(getCharacterData(response.destinyMemberships[0].membershipId), function (error, response, body) {
        var result
        try {
            var result = JSON.parse(body)

            if (result && result.Response) {
                resolve(result.Response)
            }
        } catch (e) {
            reject(error)
        }
    })
})

// function getCharacters(currentUserMembershipId, callback) {
//     request.get(getCharacterData(currentUserMembershipId), function (error, response, body) {
//         var result = JSON.parse(body)

//         if (result && result.Response) {
//             callback(result.Response.characters.data)
//         } else {
//             callback(body)
//         }
//     })
// }

function getCharacterData(currentUserMembershipId) {
    return {
        url: "https://www.bungie.net/Platform/Destiny2/1/Profile/4611686018430173826?components=200",
        headers: {
            'X-API-Key': '461360109a974a24a9f07e54653a5001',
        }
    }
}


// ------- Helper functions to build responses for Alexa -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}