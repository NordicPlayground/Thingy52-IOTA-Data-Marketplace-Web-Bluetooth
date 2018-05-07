//() {} []
//packet_blueprint - The expected structure and values of a packet
//index - The last endpoint for aggregation
//packets - The list of received packets
let packet_blueprint = ['temperature', 'humidity','pressure','co2','voc'];
let index = 0;
let packets = [];

//
export const appendPacket = (packet) => {
    packets.push(packet);
};

export const get_aggregate = () => {
    let data_table = [[], [], [], [], []];
    for(let i = 0; i < packet_blueprint.length; i++) {
        let count = packets.length - 1;
        while (true) {
            if (count < index) break;
            if (packets[count][packet_blueprint[i]]){
                console.log("adding",packet_blueprint[i],packets[count][packet_blueprint[i]]);
                data_table[i].push(packets[count][packet_blueprint[i]]);
            } else break;
            count--;
        }

    }
    let packet = {};
    console.log("filled data_table",data_table);
    data_table.forEach( (table_entry, table_index) => {
        if(table_entry.length > 0)
            packet[packet_blueprint[table_index]]
                = (Math.round( (table_entry.reduce((a, b) => a + b, 0) / table_entry.length ) * 100 ) / 100).toString();
    });

    index = packets.length;
    console.log("packet to be returned by get_aggregate",packet);
    return packet;
};
