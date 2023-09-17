'use client'
import { MapContainer, TileLayer } from 'react-leaflet'

type props = {lat:number, long:number}
export default function MapMETAR({lat, long}: props) {
    return (
        <MapContainer className='h-96 w-96' center={[lat, long]} zoom={13} scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        </MapContainer>
    );
}