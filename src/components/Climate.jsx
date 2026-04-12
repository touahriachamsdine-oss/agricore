import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useI18n } from '../context/i18nContext';
import { RiTempHotLine, RiMistLine, RiCloudLine, RiSunLine, RiWaterFlashLine } from 'react-icons/ri';

const Climate = () => {
    const { location } = usePlatform();
    const { t, locale } = useI18n();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClimateData = async () => {
            if (!location) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const lat = location.lat;
                const lng = location.lng;

                // Open-Meteo Agricultural API: Soil + 5-Day Forecast + Hourly (12h)
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,evapotranspiration,soil_temperature_6cm&hourly=temperature_2m,precipitation_probability,evapotranspiration,soil_temperature_0_to_10cm&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;

                const response = await fetch(url);
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError("Signal Degraded. Soil telemetry offline.");
            } finally {
                setLoading(false);
            }
        };

        fetchClimateData();
    }, [location]);

    if (!location) return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
            <h3 className="orbitron">LOCATION ANCHOR REQUIRED</h3>
            <p className="text-dim">Activate Field Map to establish atmospheric telemetry.</p>
        </div>
    );

    if (loading || !data) return <div className="text-dim">Ingesting biometric payloads...</div>;
    if (error) return <div className="glow-text-secondary">{error}</div>;

    return (
        <div className="climate-module" style={{ color: 'var(--text-main)' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 className="orbitron glow-text-primary" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{t('atmospheric_telemetry')}</h3>
                <p className="text-dim" style={{ fontSize: '0.8rem' }}>LIVE SIGNAL: STABLE • COORDINATES: {location?.lat || '...'}, {location?.lng || '...'}</p>
            </header>

            <div className="climate-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="glass-panel stat-card">
                    <h4 className="text-dim">{t('apparent_temp')}</h4>
                    <h2 className="glow-text-primary" style={{ fontSize: '2.5rem' }}>{data.current.apparent_temperature}°C</h2>
                </div>
                <div className="glass-panel stat-card">
                    <h4 className="text-dim">{t('precipitation')}</h4>
                    <h2 className="glow-text-primary" style={{ fontSize: '2.5rem' }}>{data.current.precipitation}mm</h2>
                </div>
            </div>

            {/* HOURLY THERMAL GRADIENT */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', background: 'linear-gradient(180deg, rgba(220, 204, 172, 0.3) 0%, transparent 100%)' }}>
                <h4 className="orbitron" style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-lg)', color: 'var(--primary)' }}>HOURLY THERMAL GRADIENT (12H)</h4>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' }}>
                    {data.hourly.time.slice(0, 12).map((time, i) => (
                        <div key={time} style={{
                            minWidth: '100px',
                            textAlign: 'center',
                            padding: '20px 10px',
                            background: 'rgba(153, 173, 122, 0.06)',
                            borderRadius: '16px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(84, 107, 65, 0.04)'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>{new Date(time).getHours()}:00</div>
                            <div className="glow-text-primary" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{Math.round(data.hourly.temperature_2m[i])}°C</div>
                            <div style={{ fontSize: '0.7rem', marginTop: '10px', fontWeight: 700, color: data.hourly.precipitation_probability[i] > 30 ? '#c62828' : 'var(--text-dim)' }}>
                                {data.hourly.precipitation_probability[i]}% Rain
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5-DAY METEOROLOGICAL HORIZON */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 className="orbitron" style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-lg)', color: 'var(--primary)' }}>5-DAY METEOROLOGICAL HORIZON</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {data.daily.time.map((day, i) => (
                        <div key={day} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '18px 24px',
                            background: 'rgba(153, 173, 122, 0.05)',
                            borderRadius: '16px',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)' }}>
                                {new Date(day).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                {data.daily.precipitation_probability_max[i] > 40 ?
                                    <span style={{ color: '#c62828', fontWeight: 700 }}><RiCloudLine /> {data.daily.precipitation_probability_max[i]}%</span> :
                                    <span className="text-dim" style={{ fontWeight: 600 }}><RiCloudLine /> {data.daily.precipitation_probability_max[i]}%</span>}
                            </div>
                            <div style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>
                                <span className="glow-text-primary" style={{ fontSize: '1.2rem' }}>{Math.round(data.daily.temperature_2m_max[i])}°</span>
                                <span className="text-dim" style={{ marginLeft: '12px', fontSize: '0.9rem' }}>{Math.round(data.daily.temperature_2m_min[i])}°</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-lg)', borderLeft: '8px solid var(--primary)' }}>
                <h3 className="orbitron" style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>
                    {t('soil_intelligence')}
                </h3>
                <div style={{ display: 'flex', gap: '64px' }}>
                    <div>
                        <div className="text-dim" style={{ fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>{t('soil_temp_10cm')}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{data.current.soil_temperature_6cm}°C</div>
                    </div>
                    <div>
                        <div className="text-dim" style={{ fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>{t('evapotranspiration')}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{data.current.evapotranspiration}mm</div>
                    </div>
                </div>
                <div style={{ marginTop: '28px', padding: '20px', background: 'rgba(84, 107, 65, 0.05)', borderRadius: '16px', fontSize: '0.9rem', lineHeight: 1.6, border: '1px solid rgba(84, 107, 65, 0.1)' }}>
                    <strong style={{ color: 'var(--primary)' }}>AGRONOMIST INSIGHT:</strong> {data.current.evapotranspiration > 0.05 ?
                        "High transpiration detected. Monitor vascular pressure and optimize hydration windows." :
                        "Metabolic levels nominal. Soil thermal inertia is within optimal growth range."}
                </div>
            </div>
        </div>
    );
};

export default Climate;
