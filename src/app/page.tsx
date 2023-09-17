import { Suspense } from 'react';
import { stations } from '../lib/stations'
import Loading from './loading';
import { getHottestMetar } from '../lib/queries';
import StationData from '../components/StationData';

import dynamic from 'next/dynamic';
const MapMETAR = dynamic(() => import("../components/MapMETAR"), { ssr: false });

export default async function Home() {

  const hottestMetarStation = await getHottestMetar();

  return (
    <>
      <Suspense fallback={<Loading />}>
        <StationData station={hottestMetarStation} />
      </Suspense>

      <MapMETAR lat={stations[hottestMetarStation?.station].location.latitude}
        long={stations[hottestMetarStation?.station].location.longitude} />
    </>
  );
}
