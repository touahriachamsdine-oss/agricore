import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/FieldMap.css';
import L from 'leaflet';
import { usePlatform } from '../context/PlatformContext';

// Fix for default marker icons in Leaflet with React
// Using a simple DivIcon for the custom futuristic feel
const createIcon = (color, glow, isHome = false) => new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${isHome ? '20px' : '12px'}; height: ${isHome ? '20px' : '12px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${glow}"></div>`
});

const LocationMarker = ({ setSettingHome }) => {
    const { setPins, pins, setHomeLocation, updateWeatherForLocation } = usePlatform();
    useMapEvents({
        click(e) {
            if (window.confirm("Set this as your HOME LOCATION?")) {
                setHomeLocation(e.latlng);
                updateWeatherForLocation(e.latlng);
                setSettingHome(false);
            } else {
                const type = window.confirm("Mark as SPREAD RISK (Red)? Cancel for ISOLATED (Yellow)") ? 'risk' : 'isolated';
                setPins([...pins, { id: Date.now(), latlng: e.latlng, type }]);
            }
        },
    });
    return null;
};

const FieldMap = () => {
    const { pins, setPins, homeLocation, setHomeLocation, updateWeatherForLocation } = usePlatform();
    const [settingHome, setSettingHome] = useState(!homeLocation);

    const center = homeLocation ? [homeLocation.lat, homeLocation.lng] : [34.0522, -118.2437];

    return (
        <div className="map-module">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="glow-text-primary">Interactive Field Map</h2>
                    <p className="text-dim">
                        {homeLocation ? `Home Anchored: ${homeLocation.lat.toFixed(4)}, ${homeLocation.lng.toFixed(4)}` : "Click map to set your HOME LOCATION first."}
                    </p>
                </div>
                <button className="btn-primary" onClick={() => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                            setHomeLocation(loc);
                            updateWeatherForLocation(loc);
                        });
                    }
                }}>AUTO-DETECT LOCATION</button>
            </div>

            <div className="map-wrapper glass-panel">
                <MapContainer center={center} zoom={homeLocation ? 18 : 3} className="map-container" scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <LocationMarker setSettingHome={setSettingHome} />

                    {homeLocation && (
                        <Marker position={homeLocation} icon={createIcon('#00ff88', 'rgba(0, 255, 136, 0.8)', true)}>
                            <Popup><strong>SYSTEM CORE: HOME</strong></Popup>
                        </Marker>
                    )}

                    {pins.map(pin => (
                        <React.Fragment key={pin.id}>
                            <Marker
                                position={pin.latlng}
                                icon={createIcon(pin.type === 'risk' ? '#ff3344' : '#ffcc00', pin.type === 'risk' ? 'rgba(255, 51, 68, 0.6)' : 'rgba(255, 204, 0, 0.4)')}
                            >
                                <Popup>
                                    <strong>{pin.type === 'risk' ? 'POTENTIAL SPREAD' : 'LOCALIZED ISSUE'}</strong><br />
                                    Detected: {new Date(pin.id).toLocaleDateString()}<br />
                                    <button className="btn-primary" style={{ marginTop: '8px', fontSize: '0.7rem' }}>GENERATE DIAGNOSIS</button>
                                </Popup>
                            </Marker>
                            {pin.type === 'risk' && (
                                <Circle
                                    center={pin.latlng}
                                    radius={500}
                                    pathOptions={{ color: '#ff3344', fillColor: '#ff3344', fillOpacity: 0.1 }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </MapContainer>

                <div className="map-legend glass-panel">
                    <div className="legend-item"><div className="marker-risk"></div> Spread Risk (2m Buffer)</div>
                    <div className="legend-item"><div className="marker-isolated"></div> Isolated Deficiency</div>
                </div>
            </div>
        </div>
    );
};

export default FieldMap;
