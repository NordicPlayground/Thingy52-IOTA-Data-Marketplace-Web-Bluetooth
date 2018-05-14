# Thingy:52 IOTA Data Marketplace Publisher
The *Thingy\:52 IOTA Data Marketplace Publisher* (Thingy IDMP
Publisher) allows for connecting to the Nordic Semiconductor
Thingy\:52 throug Web Bluetooth. The sensor data can then be sent to
the [IOTA Data Marketplace](https://data.iota.org/) (IDMP). This is
all done from within the web browser.

This project was developed by a group of students from NTNU as part of
their bachelor project.

## Setup
To get this application running for debug or production, you need:

* node
* npm

Clone the repository and navigate to the project directory in the
terminal. To get a dev install running:

* Run `npm install`
* Run `npm run dev`
* In a web browser, open [http://loalhost:8000/](http://loalhost:8000/)

## Using the Application
### Web Bluetooth
This application currently only work in Google Chorme (or Chromium)
version 56 or above because of the requirement for Web
Bluetooth. Make sure to enable the
[chrome://flags/#enable-experimental-web-platform-features]('Experimental Web Platform Features').

### IOTA Data Marketplace
The Thingy IDMP Publisher requires a device on the IDMP. Creating this
device requires an account on the [IDMP dashboard](https://data.iota.org/dashboard).
Use one of the following methods to add an IDMP device.


#### Creating Device using the Publisher (recommended)
To simplify this process, we have included a small tool for creating
devices.

* Click the Add Thingy button in the application.
* Log in to the [IDMP dashboard](https://data.iota.org/dashboard)
  using your Google account.
* Copy `Your API Key` and `Your User ID` from the IDMP into `API key`
  and `Owner` fields, respectivly.
* Fill in the rest of the fields, and select what channels to
  add.
* Click Save Changes, and wait for the process to complete.

The selected Device ID, and a Secret Key will be filled
out automatically in the app.

#### Creating a Device using IDMP Dashboard (alternative)
* Log into the IDMP dashboard as described above.
* Click the New Device card, and fill in the relevant information. The
  Thingy IDMP Publisher currently supports the following fields:

| Field ID    | Field Name  | Field Unit |
|-------------|-------------|------------|
| temperature | Temperature | C          |
| humidity    | Humidity    | %          |
| pressure    | Pressure    | hPa        |
| co2         | CO2         | ppm        |
| voc         | VOC         | ppb        |

* Submit the data
* Download the Publish Script
* Unpack the zip, and open index.js
* Copy the `uuid` and `secretKey` variable values into the `Device ID`
  and `Secret Key` fields of the application, respectivly.
