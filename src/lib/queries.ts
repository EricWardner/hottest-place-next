import { parseMetar, IMetarDated } from "metar-taf-parser";
import { stations } from './stations'
import { z } from "zod"
import { sql } from '@vercel/postgres';



export const stationSchema = z.object({
    "station": z.string(),
    "issued": z.string(),
    "temperature": z.number(),
    "lat": z.number().optional(),
    "long": z.number().optional(),
    "name": z.string().optional()
})
export type StationInfo = z.infer<typeof stationSchema>

export async function getHottestMetar() {
    let hottestStation: IMetarDated | null = null;

    // (i.e. 3:20pm => '19')
    const currentUTCHour = new Date().getUTCHours().toLocaleString('en-US', { minimumIntegerDigits: 2 });
    const url = `https://tgftp.nws.noaa.gov/data/observations/metar/cycles/${currentUTCHour}Z.TXT`

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
        // ID, Lat, Long, Elevation, Name
        const { rows, fields } = await sql`SELECT * FROM stations WHERE Id = ${hottestStation.station}`;

        return {
            "station": hottestStation.station,
            "issued": hottestStation.issued,
            "temperature": hottestStation.temperature,
            "lat": rows[0].lat,
            "long": rows[0].long,
            "name": rows[0].name
        }
    }
    else {
        throw new Error('Error: empty response')
    }
}

export async function getHottestMadis(): Promise<StationInfo> {
    const url = `https://madis-data.ncep.noaa.gov/madisPublic1/cgi-bin/madisXmlPublicDir?
    rdr=&time=0&minbck=-59&minfwd=0&recwin=3&dfltrsel=1&state=AK
    &latll=24.7433195&lonll=-124.7844079&latur=49.3457868&lonur=-66.9513812
    &stanam=&stasel=0&pvdrsel=1&varsel=1&qctype=0&qcsel=99&xml=3&csvmiss=1
    &pvd=ALL-MTR&pvd=ALL-MESO&pvd=ASOS&pvd=OTHER-MTR&pvd=ALL-HFMTR
    &pvd=ASOS-HFM&pvd=OTHER-HFM&pvd=SAO&pvd=COOP&pvd=UrbaNet&pvd=AFA
    &pvd=AFWS-DCP&pvd=AIRNow&pvd=AKDOT&pvd=ALERT&pvd=APG&pvd=APRSWXNET
    &pvd=ARLFRD&pvd=AVAPS&pvd=AWX&pvd=AZDOT&pvd=CADOT&pvd=CA-Hydro
    &pvd=CAIC&pvd=CC-ECONet&pvd=CoAgMet&pvd=CoCoRaHS&pvd=CODOT&pvd=CPYRWMA
    &pvd=CRN2-al&pvd=CRN&pvd=CTDOT&pvd=DCNet&pvd=DDMET&pvd=DEDOT&pvd=DEOS
    &pvd=CO_E-470&pvd=EDW&pvd=FAWN&pvd=FLDEP&pvd=FLDOT&pvd=FL-Meso&pvd=AK-Meso
    &pvd=GADOT&pvd=GAEPDMeso&pvd=GLDNWS&pvd=GLOBE&pvd=GoMOOS&pvd=GPSMET
    &pvd=HADS&pvd=HCN&pvd=IADOT&pvd=ILDOTMC&pvd=IEM&pvd=KELO&pvd=INDOT
    &pvd=INTERNET&pvd=ITD&pvd=KSDOT&pvd=KYMN&pvd=KYTC-RWIS&pvd=LSU-JSU&pvd=LCRA
    &pvd=MAP&pvd=MADOT&pvd=MDDOT&pvd=MEDOT&pvd=MesoWest&pvd=MIDOT&pvd=MISC
    &pvd=MMSD60&pvd=MNDOT&pvd=MODOT&pvd=MOComAgNet&pvd=GST-MoPED&pvd=MQT-Meso
    &pvd=MSU-15M&pvd=MTDOT&pvd=MTR-ALERT&pvd=NC-ECONet&pvd=NDAWN&pvd=NDDOT
    &pvd=NEDOR&pvd=NE-MESO&pvd=NEPP&pvd=NERRS&pvd=NHDOT&pvd=NJWxNet&pvd=NonFedAWOS
    &pvd=NOS-NWLON&pvd=NOS-PORTS&pvd=NVDOT&pvd=NWS-COOP&pvd=NYDOT&pvd=NYSM
    &pvd=OHDOT&pvd=OK-Meso&pvd=ORDOT&pvd=PADOT&pvd=PADEP&pvd=PSU-ACAQ
    &pvd=PSU-COPAMS&pvd=PSU-PATC&pvd=PCDINPE&pvd=RAWS&pvd=RDMTR&pvd=SCDOT
    &pvd=SDDOT&pvd=SDSMeso&pvd=SFWMD&pvd=UDFCD&pvd=SRWMD&pvd=SURFRAD
    &pvd=USouthAL&pvd=AWS&pvd=VADOT&pvd=VTDOT&pvd=WIDOT&pvd=WSAgMet
    &pvd=WT-Meso&pvd=WVDOT&pvd=WXforYou&pvd=WxFlow&pvd=WYDOT&pvd=YPG&nvars=T`

    const res = await fetch(url)
    if (!res.ok) {
        throw new Error('Error fetching data')
    }

    const resData = await res.text()

    let weatherData = resData.split('\n')
    weatherData = weatherData.slice(9)
    weatherData[0] = weatherData[0].replace("<h3><PRE>", '')
    weatherData.pop()
    weatherData.pop()
    weatherData.pop()

    if (weatherData[0].includes("No matching data found.")) {
        throw new Error('Error no data found');
    }

    let hottestStation: StationInfo = { station: "INIT", temperature: Number.MIN_SAFE_INTEGER, issued: "INIT" };

    for (const line of weatherData) {
        const entry = line.split(',')

        const date_str = `${entry[1]} ${entry[2]}Z`
        const dt = new Date(date_str)
        const time_val = dt.toISOString()

        const currentStation = {
            station: entry[0].trim(),
            temperature: parseFloat(entry[5]) - 273.15,
            issued: time_val
        }

        if (currentStation.temperature > hottestStation.temperature) {
            hottestStation = currentStation;
        }
    }

    const { rows, fields } = await sql`SELECT * FROM stations WHERE ID=${hottestStation.station}`;

    return {
        "station": hottestStation.station,
        "issued": hottestStation.issued,
        "temperature": hottestStation.temperature,
        "lat": rows[0].lat,
        "long": rows[0].long,
        "name": rows[0].name
    }
}

