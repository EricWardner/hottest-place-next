'use client'
import { IMetarDated } from "metar-taf-parser";
import { stations } from '../lib/stations'
import { StationInfo } from '../lib/queries';


type props = {station: StationInfo}
export default function StationData({station}:props) {
  return (
      <div>
        <p className="text-fluid-1">
          It&apos;s {station.temperature ? (station.temperature * 9 / 5 + 32) : 'unk'}&deg;F in {stations[station.station].name.en}, {stations[station.station].region}!
        </p>
        <p className="text-xs">
          (last reading at {(new Date(station.issued)).toLocaleTimeString()})
        </p>
      </div>      
  );
}
