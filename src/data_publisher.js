var IOTA = require('iota.lib.js');
require('./vendor/mam.web.js');
var iota = new IOTA({ provider: 'https://testnet140.tangle.works' });

let Mam;

// Set Varibles
var debug = true // Set to 'false' to publish data live
let uuid = 'thingy-01' // Your device ID is here.
let secretKey = 'THZDQLZMWESXIHI' // Your device's secret key here

// API end point
let endpoint = 'https://api.marketplace.tangle.works/newData'

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
export const publish = async packet => {
	if (!mam_initialized) {
		init_mam();
	}
	// Set channel mode & update key
	mamState = Mam.changeMode(mamState, 'restricted', mamKey)
	// Create Trytes
	var trytes = iota.utils.toTrytes(JSON.stringify(packet))
	// Get MAM payload
	var message = Mam.create(mamState, trytes)
	// Save new mamState
	mamState = message.state
	// Attach the payload.
	await Mam.attach(message.payload, message.address)
	console.log('Attached Message')

	if (!debug) {
		// Push the MAM root to the demo DB
		let pushToDemo = await pushKeys(message.root, mamKey)
		console.log(pushToDemo)
		// Change MAM key on each loop
		mamKey = keyGen(81)
	}
}

// Push keys to market place.
const pushKeys = async (root, sidekey) => {
	const packet = {
		sidekey: sidekey,
		root: root,
		time: Date.now()
	}
	// Initiate Fetch Call
	var resp = await fetch(endpoint, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id: uuid, packet, sk: secretKey })
	})
	return resp.json()
}
