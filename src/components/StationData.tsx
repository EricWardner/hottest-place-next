import { IMetarDated } from "metar-taf-parser";
import { stations } from '../lib/stations'


type props = {station: IMetarDated}
export default function StationData({station}:props) {
  return (
      <div>
        <p className="text-fluid-1">
          It&apos;s {station.temperature ? (station.temperature * 9 / 5 + 32) : 'unk'}&deg;F in {stations[station.station].name.en}, {stations[station.station].region}!
        </p>
        <p className="text-xs">
          (last reading at {station.issued.toLocaleTimeString('en-US')})
        </p>
      </div>      
  );
}
