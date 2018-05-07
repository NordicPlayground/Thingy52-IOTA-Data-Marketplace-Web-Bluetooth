import {Thingy} from "./vendor/thingy.js";
import {publish} from "./data_publisher.js";
import {appendPacket, get_aggregate} from "./aggregator.js";

let thingy = new Thingy({logEnabled: true});
let thingy_connected = false;

let publishing = false;
let sensor_array = [];


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

        let form = document.querySelector("#settings-form");
        let inputs = form.getElementsByTagName("input");
        for (let input of inputs) {
            input.disabled = publishing;
        }

        //change button color and text when connected
        let toggle_connect = document.querySelector("#connect");
        toggle_connect.innerHTML = "Disconnect";
        toggle_connect.classList.add("btn-danger");
        toggle_connect.classList.remove("btn-success");


        document.querySelector("#thingy-status-connected").innerHTML =
			`${check_mark_span} Yes`;
		document.querySelector("#thingy-status-battery").innerHTML =
			please_wait_message;
		document.querySelector("#thingy-status-name").innerHTML = await device.getName();
		document.querySelector("#toggle-publish").classList.remove("disabled")
        document.querySelector("#toggle-publish").classList.add("active")

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
				console.log("Sjekket av" + checkbox.id);
				document.querySelector(`#${name}-readout`).innerHTML =
					please_wait_message;
				await enableChannel(update_element, true);
				if (!sensor_array.includes(checkbox.id)){
                    sensor_array.push(checkbox.id);
                }
			} else {
				await enableChannel(update_element, false);
				document.querySelector(`#${name}-readout`).innerHTML = '';
                if (sensor_array.includes(checkbox.id)){
                    remove(sensor_array, checkbox.id);
                }
			}
		});
	}

	return true;
}

let publishing_interval = null;
let stop_publish_func = null;

function remove(array, element) {
    const index = array.indexOf(element);
    array.splice(index, 1);
}

// Called when the user presses the publish button. Publishes the
// thingy data to IOTA marketplace at user specified interval using
// the imported publish function
async function start_publishing(device) {
    var i;
    for (i = 0; i<sensor_array.length; i++){
        sensor_array[i] = sensor_array[i].replace('send-', '');
    }

    if (thingy_connected){

        let form = document.querySelector("#settings-form");
        let interval = parseInt(form.querySelector("#send-interval").value);
		let idmp_uuid = document.querySelector('#idmp_uuid').value;
		let idmp_secretKey = document.querySelector('#idmp_secretKey').value;

        let packet = {};
        let stop_functions = [];


        for (let [name, options] of Object.entries(channels)) {
        	//console.log("Name is: " + name);
        	if (sensor_array.includes(name)){

                let sensor_channel = name;
                if ('sensor_channel' in options) {
                    sensor_channel = options.sensor_channel;
                }
                let enableChannel = device[`${sensor_channel}Enable`].bind(device);

                let update_function = function(data) {
                    if ('transform_data' in options) {
                        data = options.transform_data(data);
                    }
                    packet[name] = data .value;//.toString();
                    console.log("packet to be appended", packet);
                    appendPacket(packet);
                };
                await enableChannel(update_function, true);
                stop_functions.push(async function() {
                    await enableChannel(update_function, false);
                });

			}
        	}

            // Uses the publish function at selected interval to post data from thingy
            let do_publish = async () => {
                countDown(60*interval);
                console.log("packet before aggregate", packet);
                packet = get_aggregate();
				console.log("publishing", packet);
				console.log("publishing", Object.keys(packet).length);



                if (!(Object.keys(packet).length === 0 && packet.constructor === Object)){
					await publish({
						time: Date.now(),
						data: packet
					}, idmp_uuid, idmp_secretKey);
                }
            };
			setTimeout(do_publish, 3000);

            publishing_interval = setInterval(do_publish, 1000 * 60 * interval);

            document.querySelector("#publish-status").innerHTML =
                "Idle";

            stop_publish_func = async function stop_publish() {
                for (let func of stop_functions) {
                    await func();
                }
            }

	}else{
		console.log("Not connected to the Thingy");
	}
}

let count_down_interval = null;

// Counts seconds in the selected interval, updates html with seconds remaining
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

	// Remove sensor data
    for (let [name, options] of Object.entries(channels)) {
        document.querySelector(`#${name}-readout`).innerHTML = '';
    }

	// Uncheck all boxes
    for (let [name, options] of Object.entries(channels)) {
        let checkbox = document.querySelector(`#send-${name}`);
        checkbox.checked = false;
    }

    if (publishing_interval != null) {
		clearInterval(publishing_interval);
	}

	if (stop_publish_func != null) {
		await stop_publish_func();
	}
	stopCountDown();

	document.querySelector("#publish-status").innerHTML =
		"Not publishing";

	sensor_array = [];
}

// Function run on page load
// Sets event listeners to the connect and publish buttons
// Runs connect(), start_publishing() and stop_publishing() if clicked


window.addEventListener('load', async function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		await connect(thingy);
	});

    //let newCheckbox = document.querySelector(`#send-${name}`);
    //console.log(document.querySelector(`#send-${name}`));
    //newCheckbox.disabled = true;

	let toggle_publishing = document.querySelector("#toggle-publish");
	let toggle_connect = document.querySelector("#connect");

	toggle_connect.addEventListener("click", async() =>{
		if (!thingy_connected){
            toggle_connect.innerHTML = "Connect";
            toggle_connect.classList.add("btn-success");
            toggle_connect.classList.remove("btn-danger");
            toggle_publishing.classList.remove("active");
            toggle_publishing.classList.add("disabled");

            let form = document.querySelector("#settings-form");
			let inputs = form.getElementsByTagName("input");
			for (let input of inputs) {
				input.disabled = true;
			}
		}
	});


	toggle_publishing.addEventListener("click", async () => {
		let form = document.querySelector("#settings-form");
		let inputs = form.getElementsByTagName("input");


    if (thingy_connected){
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
        }
	})
});
