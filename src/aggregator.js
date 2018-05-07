//() {} []
//packet_blueprint - The expected structure and values of a packet
//index - The last endpoint for aggregation
//packets - The list of received packets
let packet_blueprint = ['temperature', 'humidity','pressure','co2','voc'];
let data_table = {};

class data_list {
    constructor(type) {
        this.type = type;
        this.list = [];
    }
    append(data) {
        this.list.push(data);
    }
    get_average() {
        if (this.list.length === 0) return null;
        return (Math.round( (this.list.reduce((a, b) => a + b, 0) /
            this.list.length) * 100 ) / 100).toString();
    }
}
packet_blueprint.forEach(e => data_table[e] = new data_list(e));

export const append_datapoint = (data, type) => {
    data_table[type].append(data);
};

export const compose_packet = () => {
    let packet = {};
    packet_blueprint.forEach(e => {
        if(data_table[e].get_average() != null){
            packet[e] = data_table[e].get_average();
        }
    });
    return packet;
};
