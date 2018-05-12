# Thingy:52 IOTA Data Marketplace Publisher
This application allows for connecting to the Nordic Semiconductor
Thingy\:52 throug Web Bluetooth and sending its sensordata to the
[IOTA Data Marketplace](https://data.iota.org/) (IDMP), all from
within your web browser.

## Setup
To get this application running for debug or production, you need:

* node
* npm

Clone the repository and enter the project directory. To get a dev
install running,

* Run `npm install`
* Run `npm run dev`
* In a web browser, open [http://loalhost:8000/]

You can also only build the project without watching and running a web
server with npm run build.

## Using the Application
### Web Bluetooth
This application currently only work in Google Chorme (or Chromium)
version 56 or above because of the requirement for Web Bluetooth. To
enable this feature, you must enable the 'Experimental Web Platform
Features' flag. This can be done by going to [chrome://flags], finding
the line 'Experimental Web Platform Features', and marking it as 'Enabled'.

### IOTA Data Marketplace
This application can publish data onto the tangle without any futher
configuration. In order to publish to the IDMP, an IDMP device must be
created. This can be done in one of two ways. Both of these methods
require an account on the [IDMP dashboard](https://data.iota.org/dashboard).


#### Creating Device using IDMP Dashboard
* Log in to the [IDMP dashboard](https://data.iota.org/dashboard)
  using your Google account.
* Click the New Device card, and fill in the relevant information. For
  data fields, this application currently supports the following fields:

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

#### Creating Device using the Publisher
To simplify this process, we have created a small tool for creating
devices.

* Click the Add Thingy button in the application.
* Log into the IDMP dashboard as above.
* Copy `Your API Key` and `Your User ID` from the IDMP into `API key`
  and `Owner` fields, respectivly.
* Fill in the rest of the fields, and select what channels (fields) to
  add. The new device will have the the selected channels
  automatically created for it, as described in the table above.
* Click Save Changes, and wait for the creating to complete.
* The selected Device ID and a newly generated Secret Key will
  automatically be filled out in the application.
