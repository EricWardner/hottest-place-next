'use client'
import { MapContainer, TileLayer } from 'react-leaflet'

type props = {lat:number|undefined, long:number|undefined}
export default function MapMETAR({lat, long}: props) {
    return (
        <MapContainer className='h-96 w-96' center={[lat ?? 0, long ?? 0]} zoom={13} scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        </MapContainer>
    );
}