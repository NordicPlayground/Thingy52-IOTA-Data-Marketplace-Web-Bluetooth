import {Thingy} from "./vendor/thingy.js";
import {publish} from "./data_publisher.js";

let thingy = new Thingy({logEnabled: true});
let thingy_connected = false;

let publishing = false;


let check_mark = "&#x2713;"; // check mark character
let cross = "&#x2715;"; // cross character
let check_mark_span = `<span class="text-success">${check_mark}</span>`; // HTML for checkmark
let cross_span = `<span class="text-danger">${cross}</span>`; // HTML for cross (failed connection)

document.thingy = thingy; // makes thingy available in document scope?

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
			let message = `${cross_span} connection failed`;

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
			'<span class="text-muted">Please wait...</span>';
		document.querySelector("#thingy-status-name").innerHTML = await device.getName();

		await device.ledBreathe({color: 'red', intensity: 100, delay: 2000});

		await device.batteryLevelEnable(function(data) {
			document.querySelector("#thingy-status-battery").innerHTML =
				data.value + " " + data.unit;
		}, true);

		return true;
	} catch (err) {
		document.querySelector("#thingy-status-connected").innerHTML =
            `${cross_span} connection failed`;
		console.log(err);
		return false;
	}
}

let publishing_interval = null;

// Called when the user presses the publish button
// Publishes the thingy data to IOTA marketplace at user specified interval using the imported publish function
async function start_publishing(device) {
	let form = document.querySelector("#settings-form");
	let interval = parseInt(form.querySelector("#send-interval").value);
	let channels = {
		'temperature': form.querySelector("#send-temperature").checked,
		'pressure': form.querySelector("#send-pressure").checked,
		'humidity': form.querySelector("#send-humidity").checked,
		'gas': form.querySelector("#send-gas").checked,
	};
	interval = Math.max(interval, 1);

	if (publishing_interval != null) {
		clearInterval(publishing_interval);
	}

	let packet = {};

	// these if-statements fetches thingy data based on which channels are selected by the user
	if (channels.temperature) {
		await device.temperatureEnable(function(data) {
			packet.temperature = data.value;
			document.querySelector("#temperature-readout").innerHTML =
				data.value + " " + data.unit;
		}, true);
	}
	if (channels.pressure) {
		await device.pressureEnable(function(data) {
			packet.pressure = data.value.toString();
			document.querySelector("#pressure-readout").innerHTML =
				data.value + " " + data.unit;
		}, true);
	}
	if (channels.humidity) {
		await device.humidityEnable(function(data) {
			packet.humidity = data.value.toString();
			document.querySelector("#humidity-readout").innerHTML =
				data.value + " " + data.unit;
		}, true);
	}
	if (channels.gas) {
		await device.gasEnable(function(data) {
			packet.co2 = data.eCO2.value.toString();
			document.querySelector("#gas-readout").innerHTML =
				data.eCO2.value + " " + data.eCO2.unit;
		}, true);
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
	setInterval(do_publish, 1000 * 60 * interval);

	document.querySelector("#publish-status").innerHTML =
		"Idle";
}

// Counts seconds in the selected interval, updates html whith seconds remaining
function countDown(i) {
    let int = setInterval(function () {
        document.getElementById("publish-status-next-time").innerHTML = i + "s";
        i-- || clearInterval(int);  //if i is 0, then stop the interval
	}, 1000);
}

// stops publishing to the IOTA marketplace, resets publishing status and countdown timer in HTML
function stop_publishing() {
	if (publishing_interval != null) {
		clearInterval(publishing_interval);
	}

	document.querySelector("#publish-status").innerHTML =
		"Not publishing";
	document.querySelector("#publish-status-next-time").innerHTML =
		'<span class="text-muted">Never</span>';
}

// Function run on page load
// Sets event listeners to the connect and publish buttons
// Runs connect(), start_publishing() and stop_publishing() if clicked
window.addEventListener('load', function () {
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
			start_publishing(thingy);
		} else {
			toggle_publishing.classList.add("btn-success");
			toggle_publishing.classList.remove("btn-danger");
			toggle_publishing.innerHTML = "Start publishing";
			stop_publishing();
		}
	})
});


