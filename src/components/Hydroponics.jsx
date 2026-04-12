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

const DEFAULT_PROFILES = [
    { id: 'lettuce', name: 'LETTUCE (Leafy)', ph: 6.0, ec: 1.2, doseA: 3000, doseB: 3000, color: '#99AD7A' },
    { id: 'tomato', name: 'TOMATO (Fruit)', ph: 6.4, ec: 2.4, doseA: 5000, doseB: 5000, color: '#c62828' },
];

const Hydroponics = () => {
    const { t } = useI18n();
    const [controllerIp, setControllerIp] = useState('192.168.1.100');

    // Profiles Management
    const [profiles, setProfiles] = useState(() => {
        const saved = localStorage.getItem('agrocore_hydro_profiles');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    });
    const [selectedProfile, setSelectedProfile] = useState(profiles[0]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProfile, setNewProfile] = useState({ name: '', ph: 6.0, ec: 1.5, doseA: 3000, doseB: 3000 });

    // Manual Sensors
    const [currentPH, setCurrentPH] = useState(7.0);
    const [currentEC, setCurrentEC] = useState(1.0);

    const [isDosing, setIsDosing] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [isCheckingLine, setIsCheckingLine] = useState(false);
    const [pumpStatus, setPumpStatus] = useState({ 1: false, 2: false, 3: false });
    const [logs, setLogs] = useState([]);
    const [activePump, setActivePump] = useState(null);

    // Heartbeat Polling
    useEffect(() => {
        const checkConnection = async () => {
            setIsCheckingLine(true);
            const status = await IoTProxy.checkLink(controllerIp);
            setIsOnline(status.online);
            setIsCheckingLine(false);
        };

        checkConnection();
        const interval = setInterval(checkConnection, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [controllerIp]);

    useEffect(() => {
        localStorage.setItem('agrocore_hydro_profiles', JSON.stringify(profiles));
    }, [profiles]);

    const addProfile = () => {
        if (!newProfile.name) return;
        const p = { ...newProfile, id: Date.now().toString(), color: '#546B41' };
        setProfiles([...profiles, p]);
        setShowAddForm(false);
    };

    const removeProfile = (id) => {
        setProfiles(profiles.filter(p => p.id !== id));
        if (selectedProfile.id === id) setSelectedProfile(profiles[0]);
    };

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
    };

    const runAIDosingCycle = async () => {
        if (isDosing) return;
        setIsDosing(true);
        addLog(`NEURAL ENGINE: Analyzing Manual Telemetry...`);
        addLog(`Current: ${currentPH} PH / ${currentEC} EC | Target: ${selectedProfile.ph} PH / ${selectedProfile.ec} EC`);

        try {
            // 1. PH BALANCE (Relay 1 / GPIO 4) 
            // Calculate correction: If current PH > target PH, dose PH down.
            if (currentPH > selectedProfile.ph) {
                const phDelta = currentPH - selectedProfile.ph;
                const phDose = Math.min(Math.round(phDelta * 1000 * 2), 5000); // Max 5s pulse per cycle

                setActivePump(1);
                setPumpStatus(prev => ({ ...prev, 1: true }));
                addLog(`ACTION: High PH detected (+${phDelta.toFixed(1)}). Dosing PH Down for ${phDose}ms`);
                await IoTProxy.actuate(controllerIp, 1, 'ON', phDose);
                setPumpStatus(prev => ({ ...prev, 1: false }));
                await new Promise(r => setTimeout(r, 1000));
            } else {
                addLog(`SKIP: PH is within optimal range (${currentPH}).`);
            }

            // 2. NUTRIENT BALANCE (Relay 2 & 3 / GPIO 5, 6)
            // Calculate correction: If current EC < target EC, dose Nutrients.
            if (currentEC < selectedProfile.ec) {
                const ecDelta = selectedProfile.ec - currentEC;
                const solADose = Math.min(Math.round(ecDelta * 1000 * 1.5), selectedProfile.doseA);
                const solBDose = Math.min(Math.round(ecDelta * 1000 * 1.5), selectedProfile.doseB);

                setActivePump(2);
                setPumpStatus(prev => ({ ...prev, 2: true }));
                addLog(`ACTION: Low Nutrient density identified. Dosing Sol A for ${solADose}ms`);
                await IoTProxy.actuate(controllerIp, 2, 'ON', solADose);
                setPumpStatus(prev => ({ ...prev, 2: false }));

                await new Promise(r => setTimeout(r, 1000));

                setActivePump(3);
                setPumpStatus(prev => ({ ...prev, 3: true }));
                addLog(`ACTION: Balancing mineralization. Dosing Sol B for ${solBDose}ms`);
                await IoTProxy.actuate(controllerIp, 3, 'ON', solBDose);
                setPumpStatus(prev => ({ ...prev, 3: false }));
            } else {
                addLog(`SKIP: Nutrient density (EC) is at profile target.`);
            }

            addLog(`NEURAL ENGINE: Correction cycle complete.`);
        } catch (err) {
            addLog(`ERROR: Actuator Link Severed.`);
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
                <div className="glass-panel" style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    background: isOnline ? 'rgba(153, 173, 122, 0.1)' : 'rgba(198, 40, 40, 0.05)',
                    transition: 'all 0.5s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`status-dot ${isCheckingLine ? 'pulse' : ''}`} style={{
                            background: isOnline ? '#4CAF50' : '#c62828',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            boxShadow: isOnline ? '0 0 10px #4CAF50' : 'none'
                        }}></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isOnline ? 'var(--primary)' : '#c62828' }}>
                            {isOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={controllerIp}
                        onChange={(e) => setControllerIp(e.target.value)}
                        placeholder="ESP32 IP"
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--secondary)',
                            borderRadius: '4px',
                            color: 'var(--primary)',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            width: '100px',
                            textAlign: 'center'
                        }}
                    />
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--spacing-lg)' }}>
                {/* CONFIGURATION SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <RiSettings3Line className="text-dim" />
                                <h4 className="orbitron" style={{ fontSize: '0.8rem' }}>CROP PROFILES</h4>
                            </div>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                {showAddForm ? '×' : '+'}
                            </button>
                        </div>

                        {showAddForm && (
                            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(84, 107, 65, 0.05)', borderRadius: '8px' }}>
                                <input
                                    placeholder="Name"
                                    value={newProfile.name}
                                    onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
                                    style={{ width: '100%', marginBottom: '8px', background: 'white', border: '1px solid #ddd', padding: '4px' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <input type="number" placeholder="PH" onChange={e => setNewProfile({ ...newProfile, ph: parseFloat(e.target.value) })} />
                                    <input type="number" placeholder="EC" onChange={e => setNewProfile({ ...newProfile, ec: parseFloat(e.target.value) })} />
                                </div>
                                <button onClick={addProfile} className="btn-primary" style={{ width: '100%', marginTop: '8px', padding: '8px' }}>SAVE</button>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                            {profiles.map(profile => (
                                <div key={profile.id} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setSelectedProfile(profile)}
                                        style={{
                                            width: '100%',
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
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>Target: {profile.ph} PH • {profile.ec} EC</div>
                                    </button>
                                    {profiles.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeProfile(profile.id); }}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', opacity: 0.5 }}
                                        >
                                            DEL
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MANUAL SENSORS PANEL */}
                    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', background: 'rgba(211, 204, 172, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <RiCpuLine className="text-dim" />
                            <h4 className="orbitron" style={{ fontSize: '0.8rem' }}>MANUAL READINGS</h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-dim)' }}>CURRENT PH</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={currentPH}
                                    onChange={e => setCurrentPH(parseFloat(e.target.value))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent)', background: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-dim)' }}>CURRENT EC</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={currentEC}
                                    onChange={e => setCurrentEC(parseFloat(e.target.value))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent)', background: 'white' }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '24px', padding: '20px', justifyContent: 'center' }}
                            disabled={isDosing}
                            onClick={runAIDosingCycle}
                        >
                            {isDosing ? <RiPulseLine className="spin" /> : <RiPlayCircleLine />}
                            <span>{isDosing ? 'NEURAL AGENT ACTIVE' : 'REQUEST AI CALIBRATION'}</span>
                        </button>
                    </div>
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
