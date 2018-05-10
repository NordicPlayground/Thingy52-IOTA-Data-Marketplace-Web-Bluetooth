var IOTA = require('iota.lib.js');
require('./vendor/mam.web.js');
var iota = new IOTA({ provider: 'https://testnet140.tangle.works' });

let Mam;

// Set Varibles
var debug = false; // Set to 'false' to publish data live
//let uuid = 'thingy-02'; // Your device ID is here.
//let secretKey = 'T9XKPHUAMYBIPVC'; // Your device's secret key here

// API end point
let endpoint = 'https://api.marketplace.tangle.works/';
let newDataEndpoint = endpoint + 'newData';
let newDeviceEndpoint = endpoint + 'newDevice';

// Random Key Generator
const keyGen = length => {
    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9'
    var array = new Uint32Array(length)
    var values = window.crypto.getRandomValues(array)
    var result = new Array(length)
    for (var i = 0; i < length; i++) {
    result[i] = charset[values[i] % charset.length]
    }
    return result.join('')
}

let mam_initialized = false;
let mamState;
let mamKey;

function init_mam() {
	Mam = window.Mam;
	// Initialise MAM State
	mamState = Mam.init(iota, keyGen(81))
	mamKey = keyGen(81) // Set initial key
}

// Publish to tangle
export const publish = async (packet,uuid,secretKey) => {
	console.log("Publishing", packet, uuid, secretKey);
	if (!mam_initialized) {
		init_mam();
	}
	// Set channel mode & update key
	mamState = Mam.changeMode(mamState, 'restricted', mamKey)
	// Create Trytes
	var trytes = iota.utils.toTrytes(JSON.stringify(packet))
	// Get MAM payload
	console.log('Encrypting')
	var message = Mam.create(mamState, trytes)
	// Save new mamState
	mamState = message.state
	// Attach the payload.
	console.log('Attaching to tangle')
	await Mam.attach(message.payload, message.address)
	console.log('Attached Message')
	console.log(packet, message.address, mamKey);

	if (!debug) {
		// Push the MAM root to the demo DB
		console.log('Sending to IDMP')
		let pushToDemo = await pushKeys(message.root, mamKey, uuid, secretKey)
		console.log(pushToDemo)
		// Change MAM key on each loop
		mamKey = keyGen(81)
	}
}

// Push keys to market place.
const pushKeys = async (root, sidekey, uuid, secretKey) => {
	const packet = {
		sidekey: sidekey,
		root: root,
		time: Date.now()
	}
	// Initiate Fetch Call
	var resp = await fetch(newDataEndpoint, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id: uuid, packet, sk: secretKey })
	})
	if (!resp.ok) {
		console.warn("IDMP push failed", await resp.text());
		return;
	}
	return resp.json()
}

export const createDevice = async (apikey, owner, name, position, channels) => {
	var sk = keyGen(15);
	var address = keyGen(81);

	var possibleChannels = {
		'temperature': {
			'id': 'temperature',
			'unit': 'C',
			'name': 'Temperature',
		},
		'presure': {
			'id': 'pressure',
			'unit': 'hPa',
			'name': 'Pressure',
		},
		'humidity': {
			'id': 'humidity',
			'unit': '%',
			'name': 'Humidity',
		},
		'co2': {
			'id': 'co2',
			'unit': 'ppm',
			'name': 'CO2',
		},
		'voc': {
			'id': 'voc',
			'unit': 'ppb',
			'name': 'VOC',
		},
	};

	var channels = channels.map(name => possibleChannels[name]);

	var resp = await fetch(newDeviceEndpoint, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			'apiKey': apikey,
			'sk': sk,
			'id': name,
			'device': {
				'sensorId': name,
				'type': 'Nordic Thingy:52',
				'location': {
					'country': position.country,
					'city': position.city,
				},
				'lon': position.lon,
				'lat': position.lat,
				'dataTypes': channels,
				'owner': owner,
				'address': address,
			},
		})
	});

	return {
		'name': name,
		'sk': sk,
		'address': address,
	}
}
