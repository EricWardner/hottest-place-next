'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Loading from './loading'
import HottestPlaceInfo from '../components/HottestPlaceInfo'
import { HottestPlace, hottestPlaceSchema } from '../lib/hottest-schema'

const HotspotMap = dynamic(() => import('../components/HotspotMap'), { ssr: false })

export default function Home() {
  const [data, setData] = useState<HottestPlace>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/hottest-place')
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        setData(hottestPlaceSchema.parse(body))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    fetchData()
  }, [])

  if (error) return <p className="text-fluid-1">Couldn&apos;t find the hottest place right now ({error}).</p>
  if (!data) return <Loading />

  return (
    <>
      <HottestPlaceInfo data={data} />
      <HotspotMap hotspot={data.hotspot} station={data.station} />
      <p className="text-xs max-w-prose">
        Data: NOAA/NCEP Real-Time Mesoscale Analysis (RTMA), NOAA MADIS and its mesonet data providers, and
        the National Weather Service. NOAA and its data providers disclaim liability of any kind whatsoever,
        including, without limitation, liability for quality, performance, merchantability and fitness for a
        particular purpose arising out of the use or inability to use the data.
      </p>
    </>
  )
}
