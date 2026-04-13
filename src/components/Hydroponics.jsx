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

    const [esp32Ip, setEsp32Ip] = useState(localStorage.getItem('agro_node_ip') || '192.168.1.185');
    const [isOnline, setIsOnline] = useState(false);
    const [isCloudLinked, setIsCloudLinked] = useState(false);
    const [nodeId, setNodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [isDosing, setIsDosing] = useState(false);
    const [pumpStatus, setPumpStatus] = useState({ 1: false, 2: false, 3: false });
    const [logs, setLogs] = useState([]);
    const [activePump, setActivePump] = useState(null);

    // Heartbeat Polling
    useEffect(() => {
        IoTProxy.connect(nodeId, setIsCloudLinked);

        const checkStatus = async () => {
            const status = await IoTProxy.checkLink(esp32Ip);
            setIsOnline(status.online);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, [esp32Ip, nodeId]);

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
        setLogs(prev => [`${msg}`, ...prev.slice(0, 4)]);
    };

    const runAIDosingCycle = async () => {
        if (!selectedProfile || isDosing) return;

        setIsDosing(true);
        addLog(`NEURAL ENGINE: Initializing Cloud Corrective Pulse...`);
        try {
            const targetId = isCloudLinked ? nodeId : esp32Ip;
            const method = isCloudLinked ? 'CLOUD' : 'DIRECT';

            addLog(`ACTUATION MODE: ${method} [Target: ${targetId}]`);

            // Sol A & B impulses
            await IoTProxy.actuate(targetId, 2, 'ON', 500);
            addLog(`ACTION: Nutrient A Pulse Transmitted.`);
            await IoTProxy.actuate(targetId, 3, 'ON', 500);
            addLog(`ACTION: Nutrient B Pulse Transmitted.`);

            if (currentPH > selectedProfile.ph) {
                addLog(`ACTION: High PH detected. Dosing PH Down...`);
                await IoTProxy.actuate(targetId, 1, 'ON', 1000);
            }

            addLog(`NEURAL ENGINE: Pulse cycle complete.`);
        } catch (err) {
            addLog(`ERROR: Imperial Link Severed.`);
            console.error("Link Severed during Pulse:", err);
        } finally {
            setIsDosing(false);
        }
    };

    return (
        <div className="hydro-module animate-fade">
            <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 className="orbitron glow-text-primary" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>HYDROPONIC NEURAL PROXY</h3>
                    <p className="text-dim" style={{ fontSize: '0.85rem' }}>AI-DRIVEN NUTRIENT & PH COMMAND CENTER</p>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    background: isCloudLinked ? 'rgba(153, 173, 122, 0.1)' : 'rgba(198, 40, 40, 0.05)',
                    border: `1px solid ${isCloudLinked ? 'var(--secondary)' : '#c62828'}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className={`status-dot ${isCloudLinked ? 'pulse' : ''}`} style={{
                            background: isCloudLinked ? '#4CAF50' : '#c62828',
                            width: '6px', height: '6px', borderRadius: '50%'
                        }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>CLOUD</span>
                    </div>
                    <div style={{ width: '1px', height: '10px', background: 'var(--secondary)', opacity: 0.3 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            background: isOnline ? '#4CAF50' : '#888',
                            width: '6px', height: '6px', borderRadius: '50%'
                        }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>LOCAL</span>
                    </div>
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

                        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
                            <div className="config-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.6 }}>NODE ID (CLOUD)</label>
                                <input value={nodeId} onChange={e => setNodeId(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                <label style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.6, marginTop: '10px' }}>LOCAL IP (FALLBACK)</label>
                                <input value={esp32Ip} onChange={e => setEsp32Ip(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                            </div>
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
