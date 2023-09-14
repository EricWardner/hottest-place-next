'use client'

import { stations } from '../lib/stations'
import { useQuery } from '@tanstack/react-query'
import { getHottestMetar } from '../lib/queries';

import dynamic from 'next/dynamic';
const MapMETAR = dynamic(() => import("./MapMETAR"), { ssr: false });

export default function HottestMETAR() {
  const { isLoading, error, data, isSuccess } = useQuery({
    queryKey: ['METARData'],
    queryFn: getHottestMetar,
    refetchOnWindowFocus: false,
  })

  if (isLoading) return 'Loading...'

  if (error) return 'An error has occurred: '

  if (isSuccess) {
    return (
      <div className="grid grid-cols-1 gap-32 justify-items-center font-mono">

        <div>
          <p className="text-fluid-1">
            It&apos;s {data.temperature ? (data.temperature * 9 / 5 + 32) : 'unk'}&deg;F in {stations[data.station].name.en}, {stations[data.station].region}!
          </p>
          <p className="text-xs">
            (last reading at {data.issued.toLocaleTimeString('en-US')})
          </p>
        </div>

        <MapMETAR lat={stations[data?.station].location.latitude} long={stations[data?.station].location.longitude} />
      
      </div>
    );
  }
}