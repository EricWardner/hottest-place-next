'use client'
import { useEffect, useState } from 'react';
import { stations } from '../lib/stations'
import Loading from './loading';
import StationData from '../components/StationData';
import { StationInfo, stationSchema } from '../lib/queries';

import dynamic from 'next/dynamic';
const MapMETAR = dynamic(() => import("../components/MapMETAR"), { ssr: false });

export default function Home() {
  const [hottestMetarStation, setHottestMetarStation] = useState<StationInfo>();

  useEffect(() => {
    // fetch data
    const fetchData = async () => {
      const data = await (
        await fetch('/api/hottest-station')
      ).json()

      stationSchema.parse(data)
      setHottestMetarStation(data)
    };

    fetchData();
  }, []);

  return (
    <>
      {hottestMetarStation ? (
        <>
          <StationData station={hottestMetarStation} />
          <MapMETAR lat={stations[hottestMetarStation.station].location.latitude}
            long={stations[hottestMetarStation.station].location.longitude} />
        </>
      ) : (
        <Loading />
      )}
    </>
  )
}
