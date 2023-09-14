'use client'
import { useState } from 'react';
import { parseMetar, IMetarDated } from "metar-taf-parser";
import { stations } from '../lib/stations'
import { useQuery } from '@tanstack/react-query'

import dynamic from 'next/dynamic';
const MapMETAR = dynamic(() => import("./MapMETAR"), {ssr:false});
const [hottestStation, setHottestStation] = useState<IMetarDated | null>(null);

export default function HottestMETAR() {
  // (i.e. 3:20pm => '19')
  const currentUTCHour = new Date().getUTCHours().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const url = `https://tgftp.nws.noaa.gov/data/observations/metar/cycles/${currentUTCHour}Z.TXT`
  console.log(url)

  const { isLoading, error, data, isSuccess } = useQuery({
    queryKey: ['METARData'],
    queryFn: () => fetch(url).then((res) => res.text())
  })

  if (isLoading) return 'Loading...'

  if (error) return 'An error has occurred: '
  
  let currentHottestStation: IMetarDated | null = null;
  if (isSuccess) {

    const splitData = data.split('\n\n');

    splitData.forEach((entry) => {
      let metarEntry = entry.split('\n')

      try {
        let currentStation = parseMetar(metarEntry[1], { issued: new Date(metarEntry[0]) })

        if (currentStation.temperature) {
          if (stations[currentStation.station].country === 'US' && currentStation.station !== "KIMM") {
            // if (currentStation.station !== "K6A2" &&
            //   currentStation.station !== "KGUL" &&
            //   currentStation.station !== "KHHV" &&
            //   currentStation.station !== "KIKT" &&
            //   currentStation.station !== "KVOA" &&
            //   stations[currentStation.station].country === 'US' &&
            //   stations[currentStation.station].region !== 'TI' &&
            //   stations[currentStation.station].region !== 'FL' &&
            //   // stations[currentStation.station].region !== 'HI' &&
            //   stations[currentStation.station].timezone !== 'Pacific/Saipan' &&
            //   stations[currentStation.station].timezone === 'America/Los_Angeles' &&
            //   stations[currentStation.station].timezone !== 'Asia/Thimphu' &&
            //   stations[currentStation.station].timezone !== 'America/Puerto_Rico' &&
            //   stations[currentStation.station].timezone !== 'Pacific/Guam') {

            // If it's the first time going through
            currentHottestStation = currentHottestStation ?? currentStation;

            if (currentHottestStation.temperature &&
              currentStation.temperature > currentHottestStation.temperature) {
              currentHottestStation = currentStation;
            }
          }
        }
      } catch (UnexpectedParseError) {
        // Ignore parse error (probably a bad METAR site)
      }
    });

    setHottestStation(currentHottestStation);

    return (
      <div className="grid grid-cols-1 gap-32 justify-items-center font-mono">
        {hottestStation?.temperature ? (
          <div>
            <p className="text-fluid-1">
              It&apos;s {hottestStation.temperature * 9 / 5 + 32}&deg;F in {stations[hottestStation.station].name.en}, {stations[hottestStation.station].region}!
            </p>
            <p className="text-xs">
              (last reading at {hottestStation.issued.toLocaleTimeString('en-US')})
            </p>
          </div>
        ) : (
          <p>Loading weather data...</p>
        )}
        {hottestStation?.station ? (
          <MapMETAR lat={stations[hottestStation?.station].location.latitude} long={stations[hottestStation?.station].location.longitude} />
        ) : (
          <p>Loading map...</p>
        )}
      </div>
    );
  }
}