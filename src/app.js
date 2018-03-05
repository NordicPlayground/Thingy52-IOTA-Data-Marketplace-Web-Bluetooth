import {Thingy} from "./vendor/thingy.js";
import {publish} from "./data_publisher.js";

let thingy = new Thingy({logEnabled: true});
let thingy_connected = false;

let publishing = false;


let check_mark = "&#x2713;"; // check mark character
let cross = "&#x2715;"; // cross character
let check_mark_span = `<span class="text-success">${check_mark}</span>`; // HTML for checkmark
let cross_span = `<span class="text-danger">${cross}</span>`; // HTML for cross (failed connection)
let please_wait_message = '<span class="text-muted">Please wait...</span>';

document.thingy = thingy; // makes thingy available in document scope?

let channels = {
	'temperature': {},
	'pressure': {},
	'humidity': {},
	'co2': {sensor_channel: 'gas', transform_data: data => data.eCO2},
	'voc': {sensor_channel: 'gas', transform_data: data => data.TVOC},
};

// attempts to connect to a thingy device
async function connect(device) {
	try {
		if (thingy_connected) {
			let error = await thingy.disconnect();
			if (error) {
				console.log("Failed to disconnect:", error);
			}
			thingy_connected = false;
		}
		document.querySelector("#thingy-status-connected").innerHTML = 'Connecting...';

		let error = await device.connect();

		if (error) {
			let message = `${cross_span} connection failed: ${error}`;

			if (/User cancelled/.test(error.message)) {
				message = `${cross_span} No`;
			}

			document.querySelector("#thingy-status-connected").innerHTML = message;
			console.log(error);
			return false;
		}
		thingy_connected = true;

		document.querySelector("#thingy-status-connected").innerHTML =
			`${check_mark_span} Yes`;
		document.querySelector("#thingy-status-battery").innerHTML =
			please_wait_message;
		document.querySelector("#thingy-status-name").innerHTML = await device.getName();

		await device.ledBreathe({color: 'red', intensity: 100, delay: 2000});

		await device.batteryLevelEnable(function(data) {
			document.querySelector("#thingy-status-battery").innerHTML =
				data.value + " " + data.unit;
		}, true);
	} catch (err) {
		document.querySelector("#thingy-status-connected").innerHTML =
            `${cross_span} connection failed: ${err}`;
		console.log(err);
		return false;
	}

	for (let [name, options] of Object.entries(channels)) {
		let checkbox = document.querySelector(`#send-${name}`);
		let sensor_channel = name;

		if ('sensor_channel' in options) {
			sensor_channel = options.sensor_channel;
		}

		let update_element = function(data) {
			if ('transform_data' in options) {
				data = options.transform_data(data);
			}
			document.querySelector(`#${name}-readout`).innerHTML =
				data.value + " " + data.unit;
		};

		let enableChannel = device[`${sensor_channel}Enable`].bind(device);

		checkbox.addEventListener('click', async function() {
			if (checkbox.checked) {
				document.querySelector(`#${name}-readout`).innerHTML =
					please_wait_message;
				await enableChannel(update_element, true);
			} else {
				await enableChannel(update_element, false);
				document.querySelector(`#${name}-readout`).innerHTML = '';
			}
		});
	}

	return true;
}

let publishing_interval = null;
let stop_publish_func = null;


// Called when the user presses the publish button. Publishes the
// thingy data to IOTA marketplace at user specified interval using
// the imported publish function
async function start_publishing(device) {
	let form = document.querySelector("#settings-form");
	let interval = parseInt(form.querySelector("#send-interval").value);

	let packet = {};
	let stop_functions = [];

	for (let [name, options] of Object.entries(channels)) {
		// Get the enable function for this channel
		let sensor_channel = name;
		if ('sensor_channel' in options) {
			sensor_channel = options.sensor_channel;
		}
		let enableChannel = device[`${sensor_channel}Enable`].bind(device);

		let update_function = function(data) {
			if ('transform_data' in options) {
				data = options.transform_data(data);
			}
			packet[name] = data.value.toString();
		}

		await enableChannel(update_function, true);
		stop_functions.push(async function() {
			await enableChannel(update_function, false);
		});
	}

	// Uses the publish function at selected interval to post data from thingy
	let do_publish = async () => {
		countDown(60*interval);
		if (!(Object.keys(packet).length === 0 && packet.constructor === Object)){
			await publish({
				time: Date.now(),
				data: packet
			});
		}
	};
	do_publish();
	publishing_interval = setInterval(do_publish, 1000 * 60 * interval);

	document.querySelector("#publish-status").innerHTML =
		"Idle";

	stop_publish_func = async function stop_publish() {
		for (let func of stop_functions) {
			await func();
		}
	}
}

let count_down_interval = null;

// Counts seconds in the selected interval, updates html whith seconds remaining
function countDown(i) {
	stopCountDown();
    count_down_interval = setInterval(function () {
        document.getElementById("publish-status-next-time").innerHTML = i + "s";
        i-- || clearInterval(count_down_interval);  //if i is 0, then stop the interval
	}, 1000);
}

function stopCountDown() {
	if (count_down_interval != null) {
		clearInterval(count_down_interval);
	}
	document.querySelector("#publish-status-next-time").innerHTML =
		'<span class="text-muted">Never</span>';
}

// stops publishing to the IOTA marketplace, resets publishing status and countdown timer in HTML
async function stop_publishing() {
	if (publishing_interval != null) {
		clearInterval(publishing_interval);
	}

	if (stop_publish_func != null) {
		await stop_publish_func();
	}
	stopCountDown();

	document.querySelector("#publish-status").innerHTML =
		"Not publishing";
}

// Function run on page load
// Sets event listeners to the connect and publish buttons
// Runs connect(), start_publishing() and stop_publishing() if clicked
window.addEventListener('load', async function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		await connect(thingy);
	});

	let toggle_publishing = document.querySelector("#toggle-publish");

	toggle_publishing.addEventListener("click", async () => {
		let form = document.querySelector("#settings-form");
		let inputs = form.getElementsByTagName("input");

		publishing = !publishing;

		for (let input of inputs) {
			input.disabled = publishing;
		}

		if (publishing) {
			toggle_publishing.classList.add("btn-danger");
			toggle_publishing.classList.remove("btn-success");
			toggle_publishing.innerHTML = "Stop publishing";
			await start_publishing(thingy);
		} else {
			toggle_publishing.classList.add("btn-success");
			toggle_publishing.classList.remove("btn-danger");
			toggle_publishing.innerHTML = "Start publishing";
			await stop_publishing();
		}
	})
});


