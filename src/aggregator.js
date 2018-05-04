//() {} []
//test packet
let dummy_packet = {'temperature':24,'humidity':880,
    'pressure':400,'co2':400,'voc':2};

let packets = [];


function append(packet) {
    
    c.execute("INSERT INTO data VALUES (?,?,?,?,?)",(
    packet['temperature'],
        packet['humidity'],
        packet['pressure'],
        packet['co2'],
        packet['voc']))
    conn.commit()
}

//return averages of the data, remove entries and add avg as an entry
//this can be expanded to include more powerful agregation
def get():
c.execute('''SELECT AVG(temperature),AVG(humidity),
AVG(pressure),AVG(co2),AVG(voc)
FROM data''')
a = c.fetchone()
c.execute("DELETE FROM data")
packet = {'temperature':a[0],'humidity':a[1],'pressure':a[2],
    'co2':a[3],'voc':a[4]}
append(packet)
return packet
