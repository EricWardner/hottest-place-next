'use client'
import { useEffect, useState } from 'react';
import Loading from './loading';
import StationData from '@/components/StationData';
import { StationInfo, stationSchema } from '@/lib/queries';

import dynamic from 'next/dynamic';
const MapMETAR = dynamic(() => import("@/components/MapMETAR"), { ssr: false });

export default function Home() {
  const [hottestMetarStation, setHottestMetarStation] = useState<StationInfo>();
  
  const [error, setError] = useState(null);
  if (error) {throw error}

  useEffect(() => {
    // fetch data
    const fetchData = async () => {
      const data = await (
        await fetch('/api/hottest-metar-station')
      ).json().catch(err => setError(err))

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
          <MapMETAR lat={hottestMetarStation.lat}
            long={hottestMetarStation.long} />
        </>
      ) : (
        <Loading />
      )}
    </>
  )
}
