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
  } else if (intentName == 'TransferItem') {
    handleTransferItem(intent, session, callback);
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

function handleTransferItem(intent, session, callback) {
  getCurrentUserJSON(session)
    .then(getCharactersAndInventory)
    .then(findItem.bind(null, intent))
    .then(transferItemToVault.bind(null, intent, session))
    .then(transferItemFromVault.bind(null, session))
    .then(output => {
      callback(session.attributes, buildSpeechletResponseWithoutCard(
        output.ErrorStatus,
        '',
        true
      ));
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


function transferItemToVaultOptions(itemReferenceHashId, transferToAndFrom, session) {
  let transferFrom = transferToAndFrom.from.fromId;
  let itemIdForAccount = transferToAndFrom.from.itemInstanceId;
  let itemHashId = itemReferenceHashId;

  let postData = JSON.stringify({
    'itemReferenceHash': itemHashId,
    'stackSize': 1,
    'transferToVault': true,
    'itemId': itemIdForAccount,
    'characterId': transferFrom,
    'membershipType': 1
  });

  return {
    url: 'https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/',
    headers: {
      'X-API-Key': '461360109a974a24a9f07e54653a5001',
      'authorization': 'bearer ' + session.user.accessToken
    },
    'body': postData
  };
}

const transferItemToVault = (intent, session, passedResponse) => new Promise((resolve, reject) => {
  const transferToAndFrom = buildTransferToAndFrom(intent, passedResponse);
  const itemReferenceHashId = passedResponse.itemHash;
  // resolve(transferToAndFrom);

  request.post(transferItemToVaultOptions(itemReferenceHashId, transferToAndFrom, session), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.ErrorStatus) {
        passedResponse['transferFromStatus'] = result.ErrorStatus;
        passedResponse['transferToAndFrom'] = transferToAndFrom;

        resolve(passedResponse);
      }
    } catch (e) {
      reject(error);
    }
  });
});

function transferItemFromVaultOptions(itemReferenceHashId, transferToAndFrom, session) {
  let transferTo = transferToAndFrom.to;
  let itemIdForAccount = transferToAndFrom.from.itemInstanceId;
  let itemHashId = itemReferenceHashId;

  let postData = JSON.stringify({
    'itemReferenceHash': itemHashId,
    'stackSize': 1,
    'transferToVault': false,
    'itemId': itemIdForAccount,
    'characterId': transferTo,
    'membershipType': 1
  });

  return {
    url: 'https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/',
    headers: {
      'X-API-Key': '461360109a974a24a9f07e54653a5001',
      'authorization': 'bearer ' + session.user.accessToken
    },
    'body': postData
  };
}

const transferItemFromVault = (session, passedResponse) => new Promise((resolve, reject) => {
  const itemReferenceHashId = passedResponse.itemHash;
  const toAndFrom = passedResponse.transferToAndFrom;
  
  request.post(transferItemFromVaultOptions(itemReferenceHashId, toAndFrom, session), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.ErrorStatus) {
        resolve(result);
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

const getCharactersAndInventory = response => new Promise((resolve, reject) => {
  request.get(getCharactersAndInventoryOptions(response.destinyMemberships[0].membershipId), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.Response) {
        let response = { 'characters': result.Response.characters.data, 'inventories': result.Response.characterInventories.data };
        resolve(response);
      }
    } catch (e) {
      reject(error);
    }
  });
});

function getCharactersAndInventoryOptions(currentUserMembershipId) {
  return {
    url: 'https://www.bungie.net/Platform/Destiny2/1/Profile/' + currentUserMembershipId + '?components=200,201',
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

function buildTransferToAndFrom(intent, passedResponse) {
  const intentSlots = intent.slots;
  let transferFrom;
  let transferTo;

  for (var intentSlot in intentSlots) {
    const slot = intentSlots[intentSlot];

    if (slot.name === 'TRANSFER_FROM') {
      transferFrom = slot.value.toLowerCase();
    } else if (slot.name === 'TRANSFER_TO'){
      transferTo = slot.value.toLowerCase();
    }
  }

  // You're a fucking idiot for naming these variables this way. 
  // Also, this is ugly, just like you!
  const characters = passedResponse.characters;

  for (var character in characters) {
    const characterValues = characters[character];
    if (characterValues.classType === 0) {
      if (transferFrom === 'titan') {
        transferFrom = characterValues.characterId;
      } else if (transferTo === 'titan') {
        transferTo = characterValues.characterId;
      }
    } else if (characterValues.classType === 1) {
      if (transferFrom === 'hunter') {
        transferFrom = characterValues.characterId;
      } else if (transferTo === 'hunter') {
        transferTo = characterValues.characterId;
      }
    } else if (characterValues.classType === 2) {
      if (transferFrom === 'warlock') {
        transferFrom = characterValues.characterId;        
      } else if (transferTo === 'warlock') {
        transferTo = characterValues.characterId;
      }
    }
  }

  let itemIdForAccount = '';
  let characterId = '';
  let items = '';
  const characterInventories = passedResponse.inventories;
  for (var characterInventory in characterInventories) {
    characterId = characterInventory;
    items = characterInventories[characterInventory].items;

    if (transferFrom === characterId) {
      for (const item in items) {
        const itemValues = items[item];

        if (itemValues.itemHash === passedResponse.itemHash) {
          itemIdForAccount = itemValues.itemInstanceId;
        }
      }
    }

  }

  return {
    from: {
      fromId: transferFrom,
      itemInstanceId: itemIdForAccount
    },
    to: transferTo
  };
}


function findItemOptions(item) {
  return {
    url: 'http://www.bungie.net/Platform/Destiny2/Armory/Search/DestinyInventoryItemDefinition/' + item,
    headers: {
      'X-API-Key': '461360109a974a24a9f07e54653a5001',
    }
  };
}

const findItem = (intent, passedResponse) => new Promise((resolve, reject) => {
  let item = '';
  const intentSlots = intent.slots;

  for (var intentSlot in intentSlots) {
    const slot = intentSlots[intentSlot];

    if (slot.name === 'ITEMS') {
      item = slot.value;
    }
  }

  request.get(findItemOptions(item), function (error, response, body) {
    let result;
    try {
      result = JSON.parse(body);

      if (result && result.Response) {
        passedResponse['itemHash'] = result.Response.results.results[0].hash;
        const itemHashAndCharacterData = passedResponse;
        resolve(itemHashAndCharacterData);
      }
    } catch (e) {
      reject(error);
    }
  });
});

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