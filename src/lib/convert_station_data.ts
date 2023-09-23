import { sql } from '@vercel/postgres';


const station_lists = [
    // "YPGStation.txt",
    // "WYDOTStation.txt",
    // "WXforYouStation.txt",
    // "WxFlowStation.txt",
    // "WVDOTStation.txt",
    // "WT-MesoStation.txt",
    // "WSAgMetStation.txt",
    // "WIDOTStation.txt",
    // "VTDOTStation.txt",
    // "VADOTStation.txt",
    // "UTMESNETStation.txt",
    // "USouthALStation.txt",
    // "UrbaNetStation.txt",
    // "SYNOPTICStation.txt",
    // "SURFRADStation.txt",
    // "SRWMDStation.txt",
    // "SNOTELStation.txt",
    // "SFWMDStation.txt",
    // "SDSMesoStation.txt",
    // "SDDOTStation.txt",
    // "SCHLNETStation.txt",
    // "SCDOTStation.txt",
    // "RDMTRStation.txt",
    // "RAWSStation.txt",
    // "PSU-PATCStation.txt",
    // "PSU-COPAMSStation.txt",
    // "PSU-ACAQStation.txt",
    // "PCDINPEStation.txt",
    // "PADOTStation.txt",
    // "PADEPStation.txt",
    // "ORDOTStation.txt",
    // "OK-MesoStation.txt",
    // "OHDOTStation.txt",
    // "NYSMStation.txt",
    // "NYDOTStation.txt",
    // "NWS-COOPStation.txt",
    // "NVDOTStation.txt",
    // "NRCSStation.txt",
    // "NOS-PORTSStation.txt",
    // "NOS-NWLONStation.txt",
    // "NonFedAWOSStation.txt",
    // "NMCStation.txt",
    // "NJWxNetStation.txt",
    // "NHDOTStation.txt",
    // "NERRSStation.txt",
    // "NEPPStation.txt",
    // "NE-MESOStation.txt",
    // "NEDORStation.txt",
    // "NDDOTStation.txt",
    // "NDAWNStation.txt",
    // "NC-ECONetStation.txt",
    // "NC-ECONet2Station.txt",
    // "MTR-ALERTStation.txt",
    // "MTDOTStation.txt",
    // "MSUStation.txt",
    // "MQT_MesoStation.txt",
    // "MQT-MesoStation.txt",
    // "MODOTStation.txt",
    // "MOComAgNetStation.txt",
    // "MOBILEStation.txt",
    // "MNDOTStation.txt",
    // "MMSDStation.txt",
    // "MISCStation.txt",
    // "MIDOTStation.txt",
    // "MEDOTStation.txt",
    // "MDDOTStation.txt",
    // "MAPStation.txt",
    // "MAPCAPStation.txt",
    // "MADOTStation.txt",
    // "LSU-JSUStation.txt",
    // "LCRAStation.txt",
    // "KYTC-RWISStation.txt",
    // "KYMNStation.txt",
    // "KYMN2Station.txt",
    // "KSDOTStation.txt",
    // "ITDStation.txt",
    // "INTERNETStation.txt",
    // "INDOTStation.txt",
    // "ILDOTMCStation.txt",
    // "IEMStation.txt",
    // "IADOTStation.txt",
    // "HF-METARStation.txt",
    // "HCNStation.txt",
    // "HADSStation.txt",
    // "HADS-DCPStation.txt",
    // "GPSMETStation.txt",
    // "GoMOOSStation.txt",
    // "GLOBEStation.txt",
    // "gldmesoStation.txt",
    // "gldmeso2fslStation.txt",
    // "GADOTStation.txt",
    // "FT-GREELYStation.txt",
    // "FSL-MiscStation.txt",
    // "FL-MesoStation.txt",
    // "FLDOTStation.txt",
    // "FLDEPStation.txt",
    // "EDWStation.txt",
    // "DIAStation.txt",
    // "DEOSStation.txt",
    // "DEOS2Station.txt",
    // "DEDOTStation.txt",
    // "DEDOT2Station.txt",
    // "DDMETStation.txt",
    // "DCNetStation.txt",
    // "CTDOTStation.txt",
    // "CRNStation.txt",
    // "CRN2-alStation.txt",
    // "CPYRWMAStation.txt",
    // "CO_E-470Station.txt",
    // "CODOTStation.txt",
    // "CoCoRaHSStation.txt",
    // "CoAgMetStation.txt",
    // "CC-ECONetStation.txt",
    // "CAICStation.txt",
    // "CA-HydroStation.txt",
    // "CADOTOStation.txt",
    // "CADOTD3Station.txt",
    // "CADOTD2Station.txt",
    // "AZDOTStation.txt",
    // "AWXStation.txt",
    // "AWSStation.txt",
    // "AWSMANUALStation.txt",
    // "ARLFRDStation.txt",
    // "APRSWXNETStation.txt",
    // "ALERTStation.txt",
    // "ALERTFCLStation.txt",
    // "AKDOTStation.txt",
    // "AJKNDBCStation.txt",
    // "AIRNowStation.txt",
    // "AFWSStation.txt",
    // "AFWS-DCPStation.txt",
    // "AFAStation.txt",
    // "stntbl.txt",
    // "public_stntbl.txt",
    "METARTable.txt"
]

//  Station Table format:
//
//  ProviderID|AFOS(HB5)ID|StationName|Elevation|Latitude|Longitude|dataTZ|
//  LocationDesc|StationType|NumInst|NumLevels|Maint/CalSch|SiteDesc|
//
//  ProviderID  - Data provider station ID
//  AFOS(HB5)ID - The AFOS or Handbook 5 ID (NWS assigned)
//  StationName - Text name of station
//  Elevation   - Elevation of station (m)
//  Latitude    - Latitude of station (decimal degrees, north positive)
//  Longitude   - Longitude of station (decimal degrees, east positive)
//  dataTZ      - Reporting time zone (e.g. UTC, PST8PDT)
//  LocationDesc- Location/address of Station (Text)
//  StationType - Type of station (tower, surface, floating platform, etc.)
//  NumInst     - The number of reporting instruments for the station
//  NumLevels   - Number of Reporting Levels for the data (Level information
//                should be provided in the instrument table.)
//  Maint/CalSch- Frequency of Maintenance/Calibration
//  SiteDesc    - A text description of the site surroundings
// MORI2|3|146.000  |41.35000 |-88.41667|          |USARMY-COE |ILLINOIS RIVER AT MORRIS         IL US  USARMY-COE|
// BLTM2|3|0        |39.266670|-76.57833|          |NWLON      |Baltimore, MD                          NWLON      |
// ALLC1|ALLC1|ALISO LAGUNA                     CA US |  249.9|33.535970|-117.753360|GMT|||1||||


export async function get_station_lists() {
    // const create_table_result = await sql`CREATE TABLE Stations ( ID varchar(16), Location point, Elevation integer,  Name varchar(255) );`;
    // console.log(create_table_result);

    for (const list of station_lists) {

        let url = `https://madis-data.ncep.noaa.gov/madisPublic1/data/stations/${list}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`Error fetching ${list}`);
        }

        let res_text = await res.text();
        res_text = res_text.trim();
        const stations = res_text.split('\n');
        let count = 0;
        let progress = 0;
        console.log(`\n${list}`)
        process.stdout.write("[");
        process.stdout.write(Array(30).fill(".").join(''));
        process.stdout.write("]");

        for (const station_entry of stations) {
            count += 1;
            progress = Math.trunc((count / stations.length) * 30);
            process.stdout.write('\r');
            process.stdout.write("[");
            process.stdout.write(Array(progress).fill("#").join(''));
            process.stdout.write(Array(30 - progress).fill(".").join(''));
            process.stdout.write("]");
            process.stdout.write(`${count}/${stations.length}`);

            if (list == "stntbl.txt" || list == "public_stntbl.txt") {
                if (station_entry[0] !== '#' && /(\w+\|\w+\|.*)/.test(station_entry)) {
                    const split = station_entry.split('|');
                    const st_info = split.map((x: string) => x.includes("???") ? 0 : x);
                    try {
                        await sql`INSERT INTO Stations (ID, Lat, Long, Elevation, Name) VALUES (${st_info[0]}, ${st_info[3]}, ${st_info[4]}, ${st_info[2]}, ${st_info[7]});`
                    } catch (error) {
                        console.log(error);
                        console.log(st_info);
                    }
                }
            }

            else if (list === "METARTable.txt") {
                const split = station_entry.split('\t');
                const st_info = split.map((x: string) => x.includes("???") ? 0 : x);
                try {
                    await sql`INSERT INTO Stations (ID, Lat, Long, Elevation, Name) VALUES (${st_info[1]}, ${st_info[2]}, ${st_info[3]}, ${st_info[4]}, ${st_info[5]});`
                } catch (error) {
                    console.log(error);
                    console.log(st_info);
                }
            }

            else {
                if (station_entry[0] !== '#' && /(\w+\|\w+\|.*)/.test(station_entry)) {
                    const split = station_entry.split('|');
                    const st_info = split.map((x: string) => x.includes("???") ? 0 : x);
                    try {
                        await sql`INSERT INTO Stations (ID, Lat, Long, Elevation, Name) VALUES (${st_info[1]}, ${st_info[4]}, ${st_info[5]}, ${st_info[3]}, ${st_info[2]});`
                    } catch (error) {
                        console.log(error);
                        console.log(st_info);
                    }
                }
            }
        }
    }
}


get_station_lists();