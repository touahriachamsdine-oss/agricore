import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    RiFlaskLine,
    RiPulseLine,
    RiCpuLine,
    RiPlayCircleLine,
    RiLeafLine,
    RiFocus3Line,
    RiAlertLine,
    RiRadarLine,
    RiTimerFlashLine
} from 'react-icons/ri';
import { useI18n } from '../context/i18nContext';
import { IoTProxy } from '../services/IoTProxy';

const MASTER_VAULT = {
    "ALGERIAN HERITAGE": [
        { id: 'alg-tom-tym', name: 'Tomato (Tymador)', ph: 6.2, ec: 2.8, icon: <RiFocus3Line /> },
        { id: 'alg-pep-lam', name: 'Pepper (Lamuyo)', ph: 6.0, ec: 2.5, icon: <RiFocus3Line /> },
        { id: 'alg-str-alb', name: 'Strawberry (Albion)', ph: 5.8, ec: 1.8, icon: <RiFocus3Line /> },
        { id: 'alg-let-bat', name: 'Lettuce (Batavia)', ph: 6.0, ec: 1.5, icon: <RiLeafLine /> },
    ],
    "LEAFY GREENS": [
        { id: 'let-ll', name: 'Lettuce (Loose Leaf)', ph: 6.0, ec: 1.0, icon: <RiLeafLine /> },
        { id: 'let-rm', name: 'Lettuce (Romaine)', ph: 6.2, ec: 1.2, icon: <RiLeafLine /> },
        { id: 'spin', name: 'Spinach', ph: 6.5, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'kale', name: 'Kale (Curly)', ph: 6.0, ec: 2.0, icon: <RiLeafLine /> },
    ],
    "HERBS": [
        { id: 'bas-it', name: 'Basil (Italian)', ph: 6.0, ec: 1.6, icon: <RiLeafLine /> },
        { id: 'mint', name: 'Mint (Peppermint)', ph: 6.5, ec: 2.2, icon: <RiLeafLine /> },
        { id: 'cil', name: 'Cilantro', ph: 6.0, ec: 1.4, icon: <RiLeafLine /> },
    ]
};

const Hydroponics = () => {
    const { t } = useI18n();

    // VARIETAL STATE
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVariety, setSelectedVariety] = useState(MASTER_VAULT["ALGERIAN HERITAGE"][0]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // TELEMETRY
    const [telemetry, setTelemetry] = useState({ ph: 7.0, ec: 1.0, p1: false, p2: false, p3: false, rssi: -60 });

    // MISSION STATE
    const [missionPlan, setMissionPlan] = useState(null);
    const [activeMission, setActiveMission] = useState(null);
    const [completedMissions, setCompletedMissions] = useState([]);

    const [autoPilot, setAutoPilot] = useState(false);
    const [isDosing, setIsDosing] = useState(false);
    const [emergencyStatus, setEmergencyStatus] = useState(false);

    const [nodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [isCloudLinked, setIsCloudLinked] = useState(false);

    useEffect(() => {
        IoTProxy.connect(nodeId, setIsCloudLinked);
        const subId = `agrocore/telemetry/${nodeId}`;

        IoTProxy.client?.on('message', (topic, message) => {
            if (topic === subId) {
                try {
                    const data = JSON.parse(message.toString());
                    setTelemetry(data);
                } catch (e) { }
            }
        });

        IoTProxy.client?.subscribe(subId);
        return () => { IoTProxy.client?.unsubscribe(subId); };
    }, [nodeId, isCloudLinked]);

    const filteredVault = useMemo(() => {
        const result = {};
        Object.entries(MASTER_VAULT).forEach(([category, items]) => {
            const matches = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
            if (matches.length > 0) result[category] = matches;
        });
        return result;
    }, [searchTerm]);

    const planMission = (silent = false) => {
        if (emergencyStatus) return;
        const plan = [];
        const phDelta = telemetry.ph - selectedVariety.ph;
        const ecDelta = selectedVariety.ec - telemetry.ec;

        if (phDelta > 0.05) {
            const cappedDur = Math.min(Math.round(phDelta * 10 * 375), 5000);
            plan.push({ relay: 1, name: 'PH DOWN', duration: cappedDur, icon: <RiFlaskLine />, reason: `PH DRIFT (+${phDelta.toFixed(2)})` });
        }

        if (ecDelta > 0.05) {
            const cappedDur = Math.min(Math.round(ecDelta * 10 * 600), 5000);
            plan.push({ relay: 2, name: 'NUTRIENT A', duration: cappedDur, icon: <RiPulseLine />, reason: `EC DEFICIT (-${ecDelta.toFixed(2)})` });
            plan.push({ relay: 3, name: 'NUTRIENT B', duration: cappedDur, icon: <RiPulseLine />, reason: `EC DEFICIT (-${ecDelta.toFixed(2)})` });
        }

        if (plan.length > 0) {
            if (silent) return plan;
            setMissionPlan(plan);
        }
    };

    const runMission = async (p = missionPlan) => {
        if (isDosing || !p || emergencyStatus) return;
        setIsDosing(true);
        setMissionPlan(null);

        try {
            for (const step of p) {
                if (emergencyStatus) break;
                setActiveMission({ ...step, remaining: step.duration });
                const startTime = Date.now();
                await IoTProxy.actuate(nodeId, step.relay, 'ON', step.duration);

                const timer = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    setActiveMission(prev => prev ? { ...prev, remaining: Math.max(0, step.duration - elapsed) } : null);
                }, 50);

                await new Promise(r => setTimeout(r, step.duration + 500));
                clearInterval(timer);
                setActiveMission(null);
                setCompletedMissions(prev => [`[${new Date().toLocaleTimeString()}] ${step.name} (${(step.duration / 1000).toFixed(1)}s)`, ...prev.slice(0, 5)]);
                await new Promise(r => setTimeout(r, 2000));
            }
        } finally {
            setIsDosing(false);
        }
    };

    const runEStop = () => {
        setEmergencyStatus(true);
        setAutoPilot(false);
        IoTProxy.actuate(nodeId, 0, 'STOP', 0);
        setActiveMission(null);
        setCompletedMissions(p => [`!!! EMERGENCY STOP ACTIVATED !!!`, ...p]);
        setTimeout(() => setEmergencyStatus(false), 5000);
    };

    useEffect(() => {
        if (!autoPilot || isDosing || emergencyStatus) return;
        const checkid = setInterval(() => {
            const plan = planMission(true);
            if (plan && plan.length > 0) runMission(plan);
        }, 15000);
        return () => clearInterval(checkid);
    }, [autoPilot, isDosing, telemetry, selectedVariety, emergencyStatus]);

    return (
        <div className="hydro-sync animate-fade" style={{ paddingBottom: '100px' }}>
            <style>{`
                .hydro-sync { color: var(--text-main); font-family: var(--font-main); }
                .main-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: var(--spacing-lg); }
                .variety-card { cursor: pointer; position: relative; padding: var(--spacing-md); }
                .vault-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--bg-deep); border: 1px solid var(--bg-block); border-radius: 12px; max-height: 300px; overflow-y: auto; box-shadow: var(--shadow-lg); }
                .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-top: 1rem; }
                .stat-unit { text-align: center; padding: var(--spacing-md); }
                .stat-value { font-family: var(--font-header); font-size: 2rem; color: var(--primary); font-weight: 800; }
                .stat-label { font-size: 0.6rem; letter-spacing: 2px; opacity: 0.6; font-weight: 900; }
                .control-btn { width: 100%; margin-top: 1rem; padding: 1rem; border-radius: 12px; border: none; font-family: var(--font-header); cursor: pointer; font-weight: 800; transition: 0.3s; background: var(--primary); color: var(--bg-deep); }
                .control-btn.active { background: var(--secondary); box-shadow: 0 0 20px rgba(153, 173, 122, 0.4); }
                .orb-container { height: 180px; display: flex; align-items: center; justify-content: center; position: relative; }
                .orb-core { font-family: var(--font-header); font-size: 3.5rem; font-weight: 900; color: var(--primary); z-index: 2; }
                .orb-pulse { position: absolute; width: 130px; height: 130px; border-radius: 50%; border: 2px solid var(--primary); opacity: 0.1; animation: grow 3s infinite; }
                @keyframes grow { from { transform: scale(0.8); opacity: 0.2; } to { transform: scale(1.4); opacity: 0; } }
                .estop-global { position: fixed; bottom: 30px; right: 30px; width: 70px; height: 70px; border-radius: 50%; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: pointer; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); z-index: 1000; border: 5px solid rgba(255,255,255,0.2); }
                .progress-wrap { background: rgba(0,0,0,0.05); height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
                .progress-active { height: 100%; background: var(--primary); transition: linear 0.1s; }
            `}</style>

            <header style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h2 className="glow-text-primary" style={{ fontSize: '1.6rem', marginBottom: '5px' }}>HYDROPONICS COMMAND</h2>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <span className="text-dim" style={{ fontSize: '0.65rem', fontWeight: 800 }}>NODE: {nodeId}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isCloudLinked ? 'var(--primary)' : '#ef4444' }}>{isCloudLinked ? '● CONNECTED' : '○ DISCONNECTED'}</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 900, opacity: 0.5 }}>PHASE 23 / DESIGN_SYNC</div>
                </div>
            </header>

            <main className="main-grid">
                <section className="selection-nexus">
                    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="variety-card glass-panel" style={{ background: 'rgba(0,0,0,0.02)' }} onClick={() => setIsSearchOpen(!isSearchOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ fontSize: '2.2rem', color: 'var(--primary)' }}>{selectedVariety.icon}</div>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{selectedVariety.name}</div>
                                    <div className="text-dim" style={{ fontSize: '0.55rem', letterSpacing: '2px', fontWeight: 800 }}>ACTIVE SPECIES PROFILE</div>
                                </div>
                            </div>
                            {isSearchOpen && (
                                <div className="vault-dropdown animate-fade">
                                    {Object.entries(MASTER_VAULT).map(([cat, items]) => (
                                        <div key={cat}>
                                            <div style={{ fontSize: '0.5rem', padding: '10px 15px', background: 'var(--bg-block)', color: 'var(--text-main)', opacity: 0.6 }}>{cat}</div>
                                            {items.map(item => (
                                                <div key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedVariety(item); setIsSearchOpen(false); }} style={{ padding: '12px 15px', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--bg-block)' }}>
                                                    {item.name}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="stat-grid">
                            <div className="stat-unit glass-panel">
                                <div className="stat-label">TARGET PH</div>
                                <div className="stat-value">{selectedVariety.ph}</div>
                            </div>
                            <div className="stat-unit glass-panel">
                                <div className="stat-label">TARGET EC</div>
                                <div className="stat-value">{selectedVariety.ec}</div>
                            </div>
                        </div>
                        <button className={`control-btn ${autoPilot ? 'active' : ''}`} onClick={() => setAutoPilot(!autoPilot)}>
                            {autoPilot ? 'AUTO-PILOT ACTIVE' : 'ENGAGE AUTO-PILOT'}
                        </button>
                    </div>
                </section>

                <section className="telemetry-nexus">
                    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="orb-container">
                            <div className="orb-pulse" />
                            <div className="orb-core">{telemetry.ph.toFixed(2)}</div>
                            <div style={{ position: 'absolute', bottom: '0', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '3px', opacity: 0.4 }}>LIVE FEEDBACK PH</div>
                        </div>
                        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="stat-unit">
                                <div className="stat-label">RESERVOIR EC</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{telemetry.ec.toFixed(2)}</div>
                            </div>
                            <div className="stat-unit">
                                <div className="stat-label">UPLINK AT</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{telemetry.rssi} dBm</div>
                            </div>
                        </div>
                        <div className="stack-area" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', borderBottom: '1px solid var(--bg-block)', paddingBottom: '10px' }}>
                                <RiCpuLine className="glow-text-primary" />
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '2px' }}>NEURAL EXECUTION STACK</span>
                            </div>
                            {activeMission ? (
                                <div className="glass-panel" style={{ padding: '1rem', borderColor: 'var(--primary)', borderLeftWidth: '5px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 900, fontSize: '0.75rem' }}>{activeMission.name}</span>
                                        <span className="orbitron" style={{ color: 'var(--primary)', fontWeight: 900 }}>{(activeMission.remaining / 1000).toFixed(1)}s</span>
                                    </div>
                                    <div className="progress-wrap">
                                        <div className="progress-active" style={{ width: `${(activeMission.remaining / activeMission.duration) * 100}%` }} />
                                    </div>
                                    <div style={{ fontSize: '0.5rem', opacity: 0.5, marginTop: '5px' }}>{activeMission.reason} • LIMIT: 5.0S</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {completedMissions.map((log, i) => (
                                        <div key={i} style={{ fontSize: '0.6rem', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', borderLeft: '2px solid var(--secondary)', opacity: 1 - (i * 0.2) }}>{log}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <div className="estop-global" onClick={runEStop} title="EMERGENCY STOP">
                <RiAlertLine />
            </div>

            {missionPlan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,248,236,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
                    <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.2rem', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                            <RiTimerFlashLine size="1.2rem" color="var(--primary)" />
                            <h3 className="glow-text-primary" style={{ fontSize: '0.85rem', fontWeight: 900, margin: 0 }}>MISSION PREVIEW</h3>
                        </div>
                        {missionPlan.map((step, i) => (
                            <div key={i} className="glass-panel" style={{ marginBottom: '10px', padding: '10px', display: 'flex', gap: '12px', background: '#fafafa' }}>
                                <div style={{ color: 'var(--primary)', fontSize: '1rem' }}>{step.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>{step.name}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: step.duration >= 5000 ? '#ef4444' : 'var(--primary)' }}>{(step.duration / 1000).toFixed(2)}s</span>
                                    </div>
                                    <div style={{ fontSize: '0.5rem', opacity: 0.5 }}>{step.reason}</div>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '1.5rem' }}>
                            <button className="control-btn" style={{ background: '#eee', color: '#555', marginTop: 0 }} onClick={() => setMissionPlan(null)}>ABORT</button>
                            <button className="control-btn" style={{ marginTop: 0 }} onClick={() => runMission()}>CONFIRM</button>
                        </div>
                    </div>
                </div>
            )}

            {!autoPilot && !missionPlan && (
                <button
                    className="control-btn"
                    style={{ position: 'fixed', bottom: '110px', right: '30px', width: 'auto', padding: '0.8rem 1.8rem', zIndex: 100, fontSize: '0.65rem' }}
                    onClick={() => planMission()}
                >
                    <RiPlayCircleLine size="1.1rem" /> MANUAL MISSION
                </button>
            )}
        </div>
    );
};

export default Hydroponics;
