//
//  Instantiate IOTA
//
let iota = new IOTA({
    'host': 'http://localhost', // should possibly be IOTA sandbox for testing with iota marketplace beta
    'port': 14265
});

let seed;
let balance = 0;
let address;

// checks the seed for invalid characters and sets the seed variable to the input
function setSeed(value){

    seed = "";
    for (let i = 0; i < value.length; i++) {
        if (("9ABCDEFGHIJKLMNOPQRSTUVWXYZ").indexOf(value.charAt(i)) < 0) {
            throw "invalid character in seed"
        } else {
            seed += value.charAt(i);
        }
    }
}

function setAdress(value){
    address = value;
}

function sendTransfer(address, value, messageTrytes){

    let transfer = [{
        'address': address,
        'value': parseInt(value), // this value needs to be scaled according to the data need of the message
        'message': messageTrytes
    }]

    console.log("Sending Transfer", transfer);

    // We send the transfer from this seed, with depth 4 and minWeightMagnitude 18
    iota.api.sendTransfer(seed, 4, 9, transfer, function(e) {

        if(e){
            console.log("transfer error: ",e);
            //TODO: show error in html
        }
        else{
            console.log("transfer completed");
        }

    })

}

// recieves Thingy sensor data as Json, convert data to messageTrytes, calls sendTransfer() with messageTrytes
function inputData(data){

    // Convert the user message into trytes
    // In case the user supplied non-ASCII characters we throw an error
    try{
        let messageTrytes = iota.utils.toTrytes(JSON.stringify(data));
        console.log("Converted Message into trytes: ", messageTrytes);
        sendTransfer(address, 1, messageTrytes);
        
    } 
    catch(e){
        console.log("input data error",e);
        //TODO: show error in html
    }
}