import React, { useState, useEffect } from 'react';
import {
    RiSettings3Line,
    RiFlaskLine,
    RiPulseLine,
    RiHistoryLine,
    RiCpuLine,
    RiPlayCircleLine,
    RiStopCircleLine
} from 'react-icons/ri';
import { useI18n } from '../context/i18nContext';
import { IoTProxy } from '../services/IoTProxy';

const CROP_PROFILES = [
    { id: 'lettuce', name: 'LETTUCE (Leafy)', ph: 6.0, ec: 1.2, doseA: 3000, doseB: 3000, color: '#99AD7A' },
    { id: 'tomato', name: 'TOMATO (Fruit)', ph: 6.4, ec: 2.4, doseA: 5000, doseB: 5000, color: '#c62828' },
    { id: 'herbs', name: 'HERBS (Light)', ph: 5.8, ec: 0.8, doseA: 2000, doseB: 2000, color: '#546B41' },
];

const Hydroponics = () => {
    const { t } = useI18n();
    const [selectedProfile, setSelectedProfile] = useState(CROP_PROFILES[0]);
    const [isDosing, setIsDosing] = useState(false);
    const [pumpStatus, setPumpStatus] = useState({ 1: false, 2: false, 3: false });
    const [logs, setLogs] = useState([]);
    const [activePump, setActivePump] = useState(null);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
    };

    const runAIDosingCycle = async () => {
        if (isDosing) return;
        setIsDosing(true);
        addLog(`NEURAL ENGINE: Initializing dosing cycle for ${selectedProfile.name}...`);

        try {
            // 1. PH BALANCE (Relay 1 / GPIO 4)
            setActivePump(1);
            setPumpStatus(prev => ({ ...prev, 1: true }));
            addLog(`ACTUATING RELAY 1: PH DOWN (GPIO 4) - Pulsing for 3000ms`);
            await IoTProxy.actuate(1, 'ON', 3000);
            setPumpStatus(prev => ({ ...prev, 1: false }));

            await new Promise(r => setTimeout(r, 1000));

            // 2. SOLUTION A (Relay 2 / GPIO 5)
            setActivePump(2);
            setPumpStatus(prev => ({ ...prev, 2: true }));
            addLog(`ACTUATING RELAY 2: SOL A (GPIO 5) - Pulsing for ${selectedProfile.doseA}ms`);
            await IoTProxy.actuate(2, 'ON', selectedProfile.doseA);
            setPumpStatus(prev => ({ ...prev, 2: false }));

            await new Promise(r => setTimeout(r, 1000));

            // 3. SOLUTION B (Relay 3 / GPIO 6)
            setActivePump(3);
            setPumpStatus(prev => ({ ...prev, 3: true }));
            addLog(`ACTUATING RELAY 3: SOL B (GPIO 6) - Pulsing for ${selectedProfile.doseB}ms`);
            await IoTProxy.actuate(3, 'ON', selectedProfile.doseB);
            setPumpStatus(prev => ({ ...prev, 3: false }));

            addLog(`NEURAL ENGINE: Cycle completed. Parameters successfully calibrated.`);
        } catch (err) {
            addLog(`ERROR: Actuation failure. Check ESP32 connectivity.`);
        } finally {
            setIsDosing(false);
            setActivePump(null);
        }
    };

    return (
        <div className="hydro-module animate-fade">
            <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 className="orbitron glow-text-primary" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>HYDROPONIC NEURAL PROXY</h3>
                    <p className="text-dim" style={{ fontSize: '0.85rem' }}>AI-DRIVEN NUTRIENT & PH COMMAND CENTER</p>
                </div>
                <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(153, 173, 122, 0.1)' }}>
                    <div className="status-dot" style={{ background: '#4CAF50', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>ESP32 LINKED: [ACTUATOR_01]</span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--spacing-lg)' }}>
                {/* CONFIGURATION SIDEBAR */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <RiSettings3Line className="text-dim" />
                        <h4 className="orbitron" style={{ fontSize: '0.8rem' }}>CROP PROFILE</h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {CROP_PROFILES.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => setSelectedProfile(profile)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: selectedProfile.id === profile.id ? 'var(--primary)' : 'rgba(84, 107, 65, 0.05)',
                                    color: selectedProfile.id === profile.id ? '#FFF8EC' : 'var(--primary)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{profile.name}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>Target PH: {profile.ph} • EC: {profile.ec}</div>
                            </button>
                        ))}
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '32px', padding: '20px', justifyContent: 'center' }}
                        disabled={isDosing}
                        onClick={runAIDosingCycle}
                    >
                        {isDosing ? <RiPulseLine className="spin" /> : <RiPlayCircleLine />}
                        <span>{isDosing ? 'AI DOSING ACTIVE' : 'RUN AI DOSING'}</span>
                    </button>
                </div>

                {/* ACTUATOR MONITOR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)' }}>
                        <div className={`glass-panel stat-card ${activePump === 1 ? 'dosing-active' : ''}`} style={{ borderLeft: pumpStatus[1] ? '4px solid #c62828' : 'none' }}>
                            <RiFlaskLine style={{ color: '#c62828', marginBottom: '12px' }} />
                            <div className="text-dim" style={{ fontSize: '0.7rem' }}>RELAY 1 (GPIO 4)</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>PH DOWN</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '8px', color: pumpStatus[1] ? '#c62828' : 'var(--text-dim)' }}>
                                {pumpStatus[1] ? 'FLOWING' : 'READY'}
                            </div>
                        </div>
                        <div className={`glass-panel stat-card ${activePump === 2 ? 'dosing-active' : ''}`} style={{ borderLeft: pumpStatus[2] ? '4px solid var(--secondary)' : 'none' }}>
                            <RiFlaskLine style={{ color: 'var(--secondary)', marginBottom: '12px' }} />
                            <div className="text-dim" style={{ fontSize: '0.7rem' }}>RELAY 2 (GPIO 5)</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>SOL A (NPK)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '8px', color: pumpStatus[2] ? 'var(--secondary)' : 'var(--text-dim)' }}>
                                {pumpStatus[2] ? 'FLOWING' : 'READY'}
                            </div>
                        </div>
                        <div className={`glass-panel stat-card ${activePump === 3 ? 'dosing-active' : ''}`} style={{ borderLeft: pumpStatus[3] ? '4px solid #546B41' : 'none' }}>
                            <RiFlaskLine style={{ color: '#546B41', marginBottom: '12px' }} />
                            <div className="text-dim" style={{ fontSize: '0.7rem' }}>RELAY 3 (GPIO 6)</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>SOL B (NPK)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '8px', color: pumpStatus[3] ? '#546B41' : 'var(--text-dim)' }}>
                                {pumpStatus[3] ? 'FLOWING' : 'READY'}
                            </div>
                        </div>
                    </div>

                    {/* NEURAL COMMAND LOG */}
                    <div className="glass-panel" style={{ flex: 1, padding: 'var(--spacing-lg)', background: 'linear-gradient(135deg, rgba(84, 107, 65, 0.02), transparent)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <RiHistoryLine className="text-dim" />
                            <h4 className="orbitron" style={{ fontSize: '0.8rem' }}>AI DECISION STREAM</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{
                                    padding: '12px 16px',
                                    background: 'rgba(84, 107, 65, 0.04)',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    color: 'var(--primary)',
                                    borderLeft: '3px solid var(--secondary)'
                                }}>
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-dim" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Awaiting neural command input...</div>}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .dosing-active {
                    animation: pulse-bg 1s infinite alternate;
                }
                @keyframes pulse-bg {
                    from { background: rgba(153, 173, 122, 0.1); }
                    to { background: rgba(153, 173, 122, 0.25); }
                }
                .spin {
                    animation: rotate 2s linear infinite;
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Hydroponics;
