import {Thingy} from "./vendor/thingy.js";

var iota = new IOTA({
});

var thingy = new Thingy({logEnabled: true});

async function start(device) {
	await device.connect();
	await device.ledConstant({red: 255, green: 0, blue: 0});
}

window.onload = function () {
	document.querySelector("#connect").addEventListener("click", async () => {
		await start(thingy);
	})
};
