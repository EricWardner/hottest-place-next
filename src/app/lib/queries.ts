import { parseMetar, IMetarDated } from "metar-taf-parser";
import { stations } from '../lib/stations'


export async function getHottestMetar() {
    let hottestStation: IMetarDated | null = null;

    // (i.e. 3:20pm => '19')
    const currentUTCHour = new Date().getUTCHours().toLocaleString('en-US', { minimumIntegerDigits: 2 });
    const url = `https://sherm.dev/https://tgftp.nws.noaa.gov/data/observations/metar/cycles/${currentUTCHour}Z.TXT`
    console.log(url)
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error('Error fetching data')
    }

    const data = await res.text()
    const splitData = data.split('\n\n');

    for (const entry of splitData) {
        let metarEntry = entry.split('\n')
        try {
            let currentStation = parseMetar(metarEntry[1], { issued: new Date(metarEntry[0]) })
            if (currentStation.temperature) {
                if (stations[currentStation.station].country === 'US' && currentStation.station !== "KIMM") {
                    hottestStation = hottestStation ?? currentStation;

                    if (hottestStation.temperature &&
                        currentStation.temperature > hottestStation.temperature) {
                        hottestStation = currentStation;
                    }
                }
            }
        } catch (UnexpectedParseError) {
            // Ignore parse error (probably a bad METAR site)
        }
    }
    
    if (hottestStation?.temperature) {
        return hottestStation
    }
    else {
        throw new Error('Error: empty response')
    }
}

