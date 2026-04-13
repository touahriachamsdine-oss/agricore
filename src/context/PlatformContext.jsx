import React, { createContext, useContext, useState, useEffect } from 'react';

const PlatformContext = createContext();

export const PlatformProvider = ({ children }) => {
    const [crops, setCrops] = useState([
        {
            id: 1,
            species: 'Lycopersicon esculentum',
            common: 'Tomato',
            status: 'optimal',
            lastWatered: '10h ago',
            stage: 'Flowering',
            harvestCountdown: 18,
            fertilizerHistory: [{ date: '2026-04-01', type: 'N-P-K 10-10-10' }]
        },
        {
            id: 2,
            species: 'Capsicum annuum',
            common: 'Bell Pepper',
            status: 'warning',
            lastWatered: '2d ago',
            stage: 'Vegetative',
            harvestCountdown: 45,
            fertilizerHistory: [{ date: '2026-03-25', type: 'Organic Compost' }]
        },
        {
            id: 3,
            species: 'Fragaria × ananassa',
            common: 'Strawberry',
            status: 'critical',
            lastWatered: '3h ago',
            stage: 'Fruiting',
            harvestCountdown: 5,
            fertilizerHistory: []
        },
    ]);

    const [alerts, setAlerts] = useState([
        { id: 1, type: 'follow-up', message: 'Follow-up needed: Tomato #14 (Powdery Mildew check)', date: '3d ago' }
    ]);

    const [journalEntries, setJournalEntries] = useState([
        {
            id: 1,
            plantId: 1, // Tomato
            date: '2026-04-10 14:30',
            observation: 'Detected yellowing on lower leaves (interveinal chlorosis).',
            aiNote: 'Likely Magnesium (Mg) deficiency due to low soil pH inhibiting uptake.',
            image: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&w=200&q=80'
        },
        {
            id: 2,
            plantId: 1, // Tomato follow-up
            date: '2026-04-13 09:15',
            observation: 'Yellowing spread to second leaf tier. Necrotic spots appearing.',
            aiNote: 'Progression alert: Deficiency not corrected. Spread rate: 1 node/3 days. Immediate pH adjustment required.',
            image: 'https://images.unsplash.com/photo-1599940824399-b87987cb5733?auto=format&fit=crop&w=200&q=80'
        }
    ]);

    const [pins, setPins] = useState([]);
    const [location, setLocation] = useState(null);

    // Auto-Detect Location on Mount (if allowed)
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setLocation(loc);
                    // Proactively wake up weather system
                    updateWeatherForLocation(loc);
                },
                (err) => console.log("Geolocation auto-anchor deferred:", err.message),
                { timeout: 10000 }
            );
        }
    }, []);

    const [pestCalendar, setPestCalendar] = useState([
        { region: 'North Africa', month: 'June', risk: 'High', threats: ['Tuta absoluta (Tomato Leafminer)', 'Spider Mites'] },
        { region: 'South Asia', month: 'June', risk: 'Moderate', threats: ['Rice Blight', 'Aphid Swarms'] }
    ]);

    const [weather, setWeather] = useState({
        temp: '--',
        humidity: '--',
        forecast: 'Awaiting Location',
        risk: 'Unknown'
    });

    const updateWeatherForLocation = (coords) => {
        // This is a placeholder for real API integration
        // We'll usually call an async fetch here, but for now we set base stats
        setWeather(prev => ({
            ...prev,
            temp: '28', // Placeholder while calibrating
            humidity: '45',
            risk: 'Optimal'
        }));
    };

    const [isMissionActive, setIsMissionActive] = useState(false);
    const [activeVariety, setActiveVariety] = useState(null);

    return (
        <PlatformContext.Provider value={{
            crops, setCrops,
            pins, setPins,
            location, setLocation,
            homeLocation: location, // Maintain backwards compatibility
            setHomeLocation: setLocation,
            journalEntries, setJournalEntries,
            alerts, setAlerts,
            pestCalendar, setPestCalendar,
            weather, updateWeatherForLocation,
            isMissionActive, setIsMissionActive,
            activeVariety, setActiveVariety
        }}>
            {children}
        </PlatformContext.Provider>
    );
};

export default PlatformProvider;
export const usePlatform = () => useContext(PlatformContext);
