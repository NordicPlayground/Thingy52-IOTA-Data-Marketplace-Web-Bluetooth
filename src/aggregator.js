//() {} []
//test packet
let dummy_packet = {'temperature':24,'humidity':880,
    'pressure':400,'co2':400,'voc':2};

let index = 0;

let packets = [];
function append(packet) {
    packets.push(packet);
}

function get() {
    let sumList = [0, 0, 0, 0, 0];
    for(let i = index; i < packets.length; i++ ) {
        sumList[0] += packets[i]['temprature'];
        sumList[1] += packets[i]['humidity'];
        sumList[2] += packets[i]['pressure'];
        sumList[3] += packets[i]['co2'];
        sumList[4] += packets[i]['voc'];
    }

    console.log(sumList);
    sumList.forEach((e) => {
        e = e/packets.length - index;
    });
    console.log(sumList);
    index = packets.length;
    console.log("index: " + index);
    return {
        'temperature':sumList[0],
        'humidity': sumList[1],
        'pressure': sumList[2],
        'co2': sumList[3],
        'voc': sumList[4]};
}

append(dummy_packet);
append(dummy_packet);
append(dummy_packet);
append(dummy_packet);

get();

