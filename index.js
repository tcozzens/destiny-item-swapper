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


    if (intentName == "TuckerTest") {
        handleGetInfoIntent(intent, session, callback)
    } else if (intentName == "TestLogin") {
        // handleTestLogin(intent, session, callback)
    } else if (intentName == "GetHoursPlayed") {
        handleGetHoursPlayed(intent, session, callback)
    }
    else {
        throw "Invalid intent"

    }
}

function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    var speechOutput = "Welcome! Do you want to hear about some facts?"

    var reprompt = "Do you want to hear about some facts?"

    var header = "Get Info"

    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

function handleGetInfoIntent(intent, session, callback) {

    var speechOutput = "We have an error"

    getJSON(function (data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}

function handleGetHoursPlayed(intent, session, callback) {

    var speechOutput = "We have an error"

    var currentUserMembershipId;
    var characters;

    getCurrentUserJSON((session), function (data) {
        var test;
        if (data != "ERROR") {
            if (data && data.destinyMemberships) {
                test = data.destinyMemberships[0].membershipId
            } else {
                test = "almost there"
            }
        }
        // if (currentUserMembershipId.destinyMemberships) {
        //     callback(session.attributes, buildSpeechletResponseWithoutCard(currentUserMembershipId.destinyMemberships[0].membershipId, "", true))
        // }
    callback(session.attributes, buildSpeechletResponseWithoutCard(test, "", true))
    
    });

    // getCharacters(currentUserMembershipId, function (data) {
    //     if (data != "ERROR") {
    //        characters = data
    //     }
    // });



    // for(character in characters) {
    //     if (character.classType === 2){
    //     callback(session.attributes, buildSpeechletResponseWithoutCard(character.minutesPlayedTotal, "", true))            
    //     }
    // }
    
}

function handleTestLogin(intent, session, callback) {

    var speechOutput = "We have an error"

    getCurrentUserJSON(function (data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}

function destinyGetCharacter() {
    return {
        url: "https://bungie.net/Platform/User/SearchUsers/?q=alltuckerdout",
        headers: {
            'X-API-Key': '461360109a974a24a9f07e54653a5001'
        }
    }
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

function getJSON(callback) {
    request.get(destinyGetCharacter(), function (error, response, body) {
        var result = JSON.parse(body)
        if (result) {
            callback(result.Response[0].displayName)
        } else {
            callback("ERROR")
        }
    })
}

function getCurrentUserJSON(session, callback) {
    console.log("got to getCurrentUserJson")
    request.get(getUserData(session), function (error, response, body) {
        console.log("getUserData")
        var result
        try {
            result = JSON.parse(body)
            if (result && result.Response) {
                callback(result.Response)
            } 
        } catch (e) {
            callback(body)
        }
    })
}

function getCharacters(currentUserMembershipId, callback) {

    request.get(getCharacterData(currentUserMembershipId), function (error, response, body) {
        console.log("getCharacterData")

        var result = JSON.parse(body)

        if (result && result.Response) {
            callback(result.Response.characters.data)
        } else {
            callback(body)
        }
    })
}

function getCharacterData(currentUserMembershipId) {
    var url = "https://www.bungie.net/Platform/Destiny2/1/Profile/" + currentUserMembershipId + "?components=200";
    return {
        url: url,
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