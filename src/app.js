import {Thingy} from "./vendor/thingy.js";
import {publish} from "./data_publisher.js";

let thingy = new Thingy({logEnabled: true});
let thingy_connected = false;

let publishing = false;

document.thingy = thingy;

async function connect(device) {
	try {
		if (thingy_connected) {
			let error = await thingy.disconnect();
			if (error) {
				console.log("Failed to disconnect:", error);
			}
			thingy_connected = false;
		}
		document.querySelector("#thingy-status-connected").innerHTML =
			'Connecting...';

		let error = await device.connect();

		if (error) {
			let message = '<span class="text-danger">&#x2715;</span> Connection failed';

			if (/User cancelled/.test(error.message)) {
				message = '<span class="text-danger">&#x2715;</span> No';
			}

			document.querySelector("#thingy-status-connected").innerHTML = message;
			console.log(error);
			return false;
		}
		thingy_connected = true;

		document.querySelector("#thingy-status-connected").innerHTML =
			'<span class="text-success">&#x2713;</span> Yes';
		document.querySelector("#thingy-status-battery").innerHTML =
			'<span class="text-muted">Please wait</span>';
		document.querySelector("#thingy-status-name").innerHTML = await device.getName();

		await device.ledBreathe({color: 'green', intensity: 100, delay: 2000});

		await device.batteryLevelEnable(function(data) {
			document.querySelector("#thingy-status-battery").innerHTML =
				data.value + " " + data.unit;
		}, true);

		return true;
	} catch (err) {
		document.querySelector("#thingy-status-connected").innerHTML =
			'<span class="text-danger">&#x2715;</span> Connection failed';
		console.log(err);
		return false;
	}
}

let publishing_interval = null;

function start_publishing() {
	let form = document.querySelector("#settings-form")
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

	setInterval(function() {
		console.log("publish", channels);
	}, 1000 * interval);

	document.querySelector("#publish-status").innerHTML =
		"Idle";
}

function stop_publishing() {
	if (publishing_interval != null) {
		clearInterval(publishing_interval);
	}

	document.querySelector("#publish-status").innerHTML =
		"Not publishing";
	document.querySelector("#publish-status-next-time").innerHTML =
		'<span class="text-muted">Never</span>';
}

window.addEventListener('load', function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		await connect(thingy);
	})

	var toggle_publishing = document.querySelector("#toggle-publish");
	toggle_publishing.addEventListener("click", async () => {
		let form = document.querySelector("#settings-form")
		let inputs = form.getElementsByTagName("input");

		publishing = !publishing;

		for (let input of inputs) {
			input.disabled = publishing;
		}

		if (publishing) {
			toggle_publishing.classList.add("btn-danger");
			toggle_publishing.classList.remove("btn-success");
			toggle_publishing.innerHTML = "Stop publishing";

			start_publishing();
		} else {
			toggle_publishing.classList.add("btn-success");
			toggle_publishing.classList.remove("btn-danger");
			toggle_publishing.innerHTML = "Start publishing";
			stop_publishing();
		}
	})
});
