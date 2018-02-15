
// var Thingy = require("./vendor/thingy.js") ;
// var Mam = require("./vendor/mam.web.js");
// import {Mam} from "./vendor/mam.web.js";
import {Thingy} from "./vendor/thingy.js";
import {publish} from "./data_publisher.js";


// console.log("Mam:  ", Mam);
console.log("Thingy:  ", Thingy);
console.log("publish:  ", publish);

var thingy = new Thingy({logEnabled: true});

document.thingy = thingy;

async function start(device) {
	await device.connect();
	await device.ledConstant({red: 255, green: 0, blue: 0});

	function print_readout(name) {
		return function(data) {
			document.querySelector(name).innerHTML = JSON.stringify(data);
		}
	}

	await device.batteryLevelEnable(print_readout("#battery-readout"), true);

	await device.setTemperatureInterval(1000);
	await device.temperatureEnable(print_readout("#temperature-readout"), true);

	await device.setPressureInterval(1000);
	await device.pressureEnable(print_readout("#pressure-readout"), true);

	await device.setHumidityInterval(1000);
	await device.humidityEnable(print_readout("#humidity-readout"), true);

	await device.setGasInterval(10);
	await device.gasEnable(print_readout("#gas-readout"), true);

	await device.setColorInterval(1000);
	await device.colorEnable(print_readout("#color-readout"), true);

	await device.buttonEnable(print_readout("#button-readout"), true);
	await device.tapEnable(print_readout("#tap-readout"), true);
	await device.orientationEnable(print_readout("#orientation-readout"), true);
	await device.quaternionEnable(print_readout("#quaternion-readout"), true);
	await device.stepEnable(print_readout("#step-readout"), true);
	await device.motionRawEnable(print_readout("#motion-readout"), true);
	await device.eulerEnable(print_readout("#euler-readout"), true);
	await device.rotationMatrixEnable(print_readout("#rotation-matrix-readout"), true);
	await device.headingEnable(print_readout("#heading-readout"), true);
	await device.gravityVectorEnable(print_readout("#gravity-readout"), true);
	await device.microphoneEnable(print_readout("#microphone-readout"), true);
}

window.onload = function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		await start(thingy);
	})
};