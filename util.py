import json

weapons = [
    'Wicked Sister',
    'Honors Edge',
    'Persuader',
    'Drang',
    'Rat King',
    'Erentil FR4',
    'Cartesian Coordinate',
    'Shock and Awe',
    'Nox Echo III',
    'Tarantula',
    'Ghost Primus',
    'Death Adder',
    'The Mornin Comes',
    'Enigmas Draw',
    'Play of the Game',
    'Haunted Earth',
    'Contingency Plan',
    'Gentleman Vagabond',
    'Traitors Fate',
    'Older Sister III'
]


alexaWeaponItems = []

for weapon in weapons: 
    alexaWeaponItems.append(
        {
          "name": {
            "value": weapon,
            "synonyms": []
          }
        }
    )



print json.dumps(alexaWeaponItems)
