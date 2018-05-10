import {Thingy} from "./vendor/thingy.js";
import {publish, createDevice} from "./data_publisher.js";
import {Aggregator} from "./aggregator.js";

let debug = false;

let thingy = new Thingy({logEnabled: true});
let thingy_connected = false;
let thingy_status = 'not_connected';
let thingy_error = null;
let thingy_data = {
	channels: {
		temperature: {active: false, value: null},
		humidity: {active: false, value: null},
		pressure: {active: false, value: null},
		co2: {active: false, value: null},
		voc: {active: false, value: null},
	},
	name: null,
	battery: null,
};

let channels = {
	'temperature': {unit: '&#x2103;'},
	'pressure': {unit: 'hPa'},
	'humidity': {unit: '%'},
	'co2': {unit: 'ppm', sensor_channel: 'gas', transform_data: data => data.eCO2},
	'voc': {unit: 'ppb', sensor_channel: 'gas', transform_data: data => data.TVOC},
};

let aggregator = new Aggregator();

let channel_notify_functions = {};

for (let [name, options] of Object.entries(channels)) {
	channel_notify_functions[name] = function(data) {
		if ('transform_data' in options) {
			data = options.transform_data(data);
		}
		thingy_data.channels[name].value = data.value;
		update_interface();

		aggregator.append_datapoint(data.value, name);
	}
}


let publishing = false;
let publish_time_left = null;
let publishing_interval = null;
let publish_pushing_to_tangle = false;

let sensor_array = [];
let checked_input = false;


let check_mark = "&#x2713;"; // check mark character
let cross = "&#x2715;"; // cross character
let check_mark_span = `<span class="text-success">${check_mark}</span>`; // HTML for checkmark
let cross_span = `<span class="text-danger">${cross}</span>`; // HTML for cross (failed connection)
let please_wait_message = '<span class="text-muted">Please wait...</span>';
let not_appliccable_message = '<span class="text-muted">n/a</span>';

document.thingy = thingy; // makes thingy available in document scope?

function number_of_active_channels() {
	let count = 0;
	for (let [name, channel] of Object.entries(thingy_data.channels)) {
		if (channel.active) {
			count += 1;
		}
	}
	return count;
}

function update_interface() {
	let el_thingy_status = document.getElementById('thingy-status-connected');

	if (thingy_status == 'not_connected') {
		el_thingy_status.innerHTML = `${cross_span} No`;
	} else if (thingy_status == 'connecting') {
		el_thingy_status.innerHTML = 'Connecting...';
	} else if (thingy_status == 'connected') {
		el_thingy_status.innerHTML = `${check_mark_span} Connected`;
	}

	let el_thingy_connect_button = document.getElementById('connect');

	if (thingy_status == 'not_connected') {
		el_thingy_connect_button.classList.add('btn-success');
		el_thingy_connect_button.classList.remove('btn-danger');
		el_thingy_connect_button.innerHTML = 'Connect';
	} else {
		el_thingy_connect_button.classList.add('btn-danger');
		el_thingy_connect_button.classList.remove('btn-success');
		el_thingy_connect_button.innerHTML = 'Disconnect';
	}

	let send_inputs = document.querySelectorAll("input[name^='send_']");
	let enable_send_inputs = (thingy_status == 'connected') && !publishing;

	for (let input of send_inputs) {
		input.disabled = !enable_send_inputs;
	}

	let toggle_publish_button = document.getElementById('toggle-publish');

	if (thingy_status == 'connected') {
		toggle_publish_button.disabled = false;
		toggle_publish_button.classList.remove('disabled');
	} else {
		toggle_publish_button.disabled = true;
		toggle_publish_button.classList.add('disabled');
	}


	let thingy_name_readout = document.getElementById('thingy-status-name');
	let thingy_battery_readout = document.getElementById('thingy-status-battery');

	if (thingy_status == 'connected') {
		for (let [name, options] of Object.entries(channels)) {
			let readout = document.getElementById(`${name}-readout`);

			if (thingy_data.channels[name].active) {
				if (thingy_data.channels[name].value !== null) {
					readout.innerHTML = `${thingy_data.channels[name].value} ${options.unit}`;
				} else {
					readout.innerHTML = please_wait_message;
				}
			} else {
				readout.innerHTML = '';
			}
		}

		if (thingy_data.name) {
			thingy_name_readout.innerHTML = thingy_data.name;
		} else {
			thingy_name_readout.innerHTML = please_wait_message;
		}
		if (thingy_data.battery) {
			thingy_battery_readout.innerHTML = `${thingy_data.battery} %`;
		} else {
			thingy_battery_readout.innerHTML = please_wait_message;
		}
	} else {
		for (let [name, options] of Object.entries(channels)) {
			let readout = document.getElementById(`${name}-readout`);
			readout.innerHTML = '';
		}
	}

	if (publishing) {
		toggle_publish_button.classList.add('btn-danger');
		toggle_publish_button.classList.remove('btn-success');
		toggle_publish_button.innerHTML = 'Stop publishing';
	} else {
		toggle_publish_button.classList.add('btn-success');
		toggle_publish_button.classList.remove('btn-danger');
		toggle_publish_button.innerHTML = 'Start publishing';

		if (number_of_active_channels() == 0) {
			toggle_publish_button.disabled = true;
			toggle_publish_button.classList.add('disabled');
		} else {
			toggle_publish_button.disabled = false;
			toggle_publish_button.classList.remove('disabled');
		}
	}

	let el_thingy_error = document.getElementById('thingy-status-error');

	if (thingy_error) {
		el_thingy_error.innerHTML = thingy_error;
		el_thingy_error.classList.remove('d-none');
	} else {
		el_thingy_error.classList.add('d-none');
	}

	let el_publish_state = document.getElementById('publish-state');
	let el_publish_next = document.getElementById('publish-next');

	if (!publishing) {
		el_publish_state.value = 'Not publishing';
		el_publish_next.value = 'Never';
	} else {
		if (publish_pushing_to_tangle) {
			el_publish_state.value = 'Publishing...';
		} else {
			el_publish_state.value = 'Idle';
		}
		el_publish_next.value = `${publish_time_left} s`;
	}
}

function update_thingy_connection_status(new_status, error) {
	thingy_status = new_status;
	thingy_error = error;

	update_interface();

	if (new_status == 'connected') {
		for (let [name, options] of Object.entries(channels)) {
			thingy_data.channels[name].value = null;
			if (thingy_data.channels[name].active) {
                let sensor_channel = name;
                if ('sensor_channel' in options) {
                    sensor_channel = options.sensor_channel;
                }
				let enableChannel = thingy[`${sensor_channel}Enable`].bind(thingy);
				enableChannel(channel_notify_functions[name], true);
			}
		}
	} else {
		for (let [name, options] of Object.entries(channels)) {
			if (thingy_data.channels[name].active) {
				// Remove the listener without notifying the device,
				// as the device is most like ly not able to respond.
				thingy.tempEventListeners[1].splice(thingy.tempEventListeners.indexOf([
					channel_notify_functions[name]
				]), 1);
			}
		}
	}
}

function update_channel_active(channel, active) {
	if (thingy_data.channels[channel].active != active) {
		thingy_data.channels[channel].active = active;
		thingy_data.channels[channel].value = null;

		update_interface();

		let sensor_channel = channel;
		if ('sensor_channel' in channels[channel]) {
			sensor_channel = channels[channel].sensor_channel;
		}
		let enableChannel = thingy[`${sensor_channel}Enable`].bind(thingy);
		enableChannel(channel_notify_functions[channel], active);
	}
}

async function disconnect(device) {
	await stop_publishing();
	if (thingy_status != 'not_connected') {
		let error = await thingy.disconnect();
		if (error) {
			console.log("Failed to disconnect:", error);
		}
		update_thingy_connection_status('not_connected');
	}
}

// attempts to connect to a thingy device
async function connect(device) {
	try {
		update_thingy_connection_status('connecting');

		let error = await device.connect();

		if (error) {
			let present_error = undefined;

			if (!(/User cancelled/.test(error.message))) {
				present_error = error;
			}

			update_thingy_connection_status('not_connected', present_error);
			console.log(error);

			return false;
		}

		update_thingy_connection_status('connected');

		thingy_data.name = await device.getName();
		update_interface();

        await device.ledBreathe({color: 'red', intensity: 100, delay: 2000});

		await device.batteryLevelEnable(function(data) {
			thingy_data.battery = data.value;
			update_interface();
		}, true);

		// Every 2 seconds
		device.setTemperatureInterval(2000);
		device.setPressureInterval(2000);
		device.setHumidityInterval(2000);

		// Every 10 seconds
		device.setGasInterval(10);

	} catch (err) {
		update_thingy_connection_status('not_connected', err);
		console.log(err);
		return false;
	}

	return true;
}

let stop_publish_func = null;

function remove(array, element) {
    const index = array.indexOf(element);
    array.splice(index, 1);
}

function is_empty_object(obj) {
	return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

// Called when the user presses the publish button. Publishes the
// thingy data to IOTA marketplace at user specified interval using
// the imported publish function
async function start_publishing(device) {
	if (publishing) {
		return;
	}

	let interval = document.getElementById('send-interval').value;

	aggregator.clear();

	let do_publish = async () => {
		let packet = aggregator.compose_packet();
		let idmp_uuid = document.querySelector("#idmp_uuid").value;
		let idmp_secretKey = document.querySelector("#idmp_secretKey").value;

		console.log("publishing", packet);

		if (!is_empty_object(packet)){
			if (!debug) {
				await publish({
					time: Date.now(),
					data: packet
				}, idmp_uuid, idmp_secretKey);
			} else {
				console.log('Publishing disabled for debug');
			}
		}
	};

	let count_down = async() => {
		publish_time_left -= 1;

		if (publish_time_left <= 0) {
			publish_time_left = interval * 60;

			publish_pushing_to_tangle = true;
			update_interface();

			await do_publish();
			publish_pushing_to_tangle = false;
		}

		update_interface();
	};

	publish_time_left = 5;
	publishing_interval = setInterval(count_down, 1000);
	publishing = true;
	update_interface();
}

// stops publishing to the IOTA marketplace, resets publishing status and countdown timer in HTML
async function stop_publishing() {
	if (!publishing) {
		return;
	}

	publishing = false;

    if (publishing_interval != null) {
		clearInterval(publishing_interval);
		publishing_interval = undefined;
	}

	update_interface();
}

// Function run on page load
// Sets event listeners to the connect and publish buttons
// Runs connect(), start_publishing() and stop_publishing() if clicked


window.addEventListener('load', async function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		if (thingy_status == 'not_connected') {
			await connect(thingy);
		} else {
			await disconnect(thingy);
		}
	});

	let idmp_uuid = document.querySelector("#idmp_uuid");
	let idmp_secretKey = document.querySelector("#idmp_secretKey");

	function load_storage() {
		var storage = window.localStorage;
		if (!storage) {
			console.warn("Local storage is not supported.");
			return;
		}

		let uuid = storage.getItem('idmp_uuid')
		let secretKey = storage.getItem('idmp_secretKey')

		if (!uuid) {
			uuid = '';
		}
		if (!secretKey) {
			secretKey = '';
		}

		idmp_uuid.value = uuid;
		idmp_secretKey.value = secretKey;
	}

	load_storage();

	function save_idmp_data() {
		var storage = window.localStorage;
		if (!storage) {
			console.warn("Local storage is not supported.");
			return;
		}
		storage.setItem('idmp_uuid', idmp_uuid.value);
		storage.setItem('idmp_secretKey', idmp_secretKey.value);
	}

	idmp_uuid.addEventListener("change", save_idmp_data);
	idmp_secretKey.addEventListener("change", save_idmp_data);


	for (let [name, options] of Object.entries(channels)) {
		let checkbox = document.getElementById(`send-${name}`);
		checkbox.addEventListener("click", () => {
			update_channel_active(name, checkbox.checked);
		});
	}

	let toggle_publishing = document.querySelector("#toggle-publish");
	let toggle_connect = document.querySelector("#connect");
	let add_device = document.querySelector("#add-device");

	toggle_publishing.addEventListener("click", async () => {
		if (!publishing) {
			if (thingy_status == 'connected' && number_of_active_channels() > 0) {
				await start_publishing(thingy);
			}
		} else {
			await stop_publishing();
		}
	});

	add_device.addEventListener("click", async () => {
		let form = document.querySelector("#add-device-form");
		let inputs = form.getElementsByTagName("input");

		let device = {}
		let position = {}
		let channels = []
		for (let input of inputs){
			device[input.name] = input.value

			if (input.name.slice(0,7) == "channel" && input.value == "on"){
				channels.push(input.name.slice(8))
			}
			switch (input.name) {
				case "device-latitude":
					position["lat"] = input.value
				case "device-longditude":
					position["lon"] = input.value
				case "device-location":
					position["city"] = input.value
				case "country":
					position["country"] = input.value

			}
		}
		console.log(device)
		console.log(position);
		console.log(channels)
		let res = await createDevice(device["api-key"], device["device-owner"], device["device-name"], position, channels)

	})

	update_interface();
});
