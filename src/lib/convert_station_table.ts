
const f = Bun.file('./stntbl.txt');

let text = await f.text()
text = text.trim()
text = text.split('\n')


let entries = {}
for (const line of text) {

    let entry = line.split('|')
    console.log(entry)

    let i_d = entry[0]
    let altitude = entry[2]
    let lat = entry[3]
    let long = entry[4]
    let name = entry[7]

    entries[i_d] = {
        "id": i_d,
        "name": { "en": name },
        "location": { "latitude": parseFloat(lat), "longitude": parseFloat(long), "elevation": parseFloat(altitude) }
    }

}

await Bun.write('./converted.ts', JSON.stringify(entries,null,2))

