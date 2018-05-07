class DataList {
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
    clear() {
        this.list = [];
    }
}

export class Aggregator {
    //packet_blueprint - The expected structure and values of a packet
    //index - The last endpoint for aggregation
    //packets - The list of received packets
    constructor() {
        this.packet_blueprint = ['temperature', 'humidity','pressure','co2','voc'];
        this.data_table = {};
        this.packet_blueprint.forEach(e => this.data_table[e] = new DataList(e));
    }
    append_datapoint(data, type) {
        this.data_table[type].append(data);
    }
    compose_packet() {
        let packet = {};
        this.packet_blueprint.forEach(e => {
            if(this.data_table[e].get_average() != null){
                packet[e] = this.data_table[e].get_average();
                this.data_table[e].clear();
            }
        });
        return packet;
    }
}
