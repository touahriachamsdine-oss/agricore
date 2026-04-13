import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    RiSettings3Line,
    RiFlaskLine,
    RiPulseLine,
    RiHistoryLine,
    RiCpuLine,
    RiPlayCircleLine,
    RiLeafLine,
    RiFocus3Line,
    RiSearchEyeLine,
    RiCheckboxCircleLine,
    RiCloseCircleLine,
    RiAlertLine,
    RiRadarLine,
    RiSunLine,
    RiTimerFlashLine,
    RiShieldCheckLine
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

    // MISSION & QUEUE STATE
    const [missionPlan, setMissionPlan] = useState(null);
    const [activeMission, setActiveMission] = useState(null); // { name: 'PH DOWN', remaining: 3500, total: 5000 }
    const [completedMissions, setCompletedMissions] = useState([]);

    const [autoPilot, setAutoPilot] = useState(false);
    const [isDosing, setIsDosing] = useState(false);
    const [emergencyStatus, setEmergencyStatus] = useState(false);

    const [nodeId, setNodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [isCloudLinked, setIsCloudLinked] = useState(false);

    // PERSISTENCE & TIMING
    const countdownRef = useRef(null);

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

        // HARD SAFETY CAP: Math.min(..., 5000)
        if (phDelta > 0.05) {
            const calculatedDur = Math.round(phDelta * 10 * 375);
            const cappedDur = Math.min(calculatedDur, 5000);
            plan.push({ relay: 1, name: 'PH DOWN', duration: cappedDur, icon: <RiFlaskLine />, reason: `PH DRIFT (+${phDelta.toFixed(2)})` });
        }

        if (ecDelta > 0.05) {
            const calculatedDur = Math.round(ecDelta * 10 * 600);
            const cappedDur = Math.min(calculatedDur, 5000);
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

                // Start Real-time Countdown for UI
                setActiveMission({ ...step, remaining: step.duration });
                const startTime = Date.now();

                // MQTT Command
                await IoTProxy.actuate(nodeId, step.relay, 'ON', step.duration);

                // Animation Loop for Progress Bar
                const timer = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const rem = Math.max(0, step.duration - elapsed);
                    setActiveMission(prev => prev ? { ...prev, remaining: rem } : null);
                    if (rem <= 0) clearInterval(timer);
                }, 50);

                await new Promise(r => setTimeout(r, step.duration + 500));
                clearInterval(timer);
                setActiveMission(null);
                setCompletedMissions(prev => [`[${new Date().toLocaleTimeString()}] ${step.name} (${(step.duration / 1000).toFixed(1)}s)`, ...prev.slice(0, 5)]);

                await new Promise(r => setTimeout(r, 2000)); // Buffer settlement
            }
        } catch (err) {
            console.error("ACTUATION_FAILURE:", err);
        } finally {
            setIsDosing(false);
            setActiveMission(null);
        }
    };

    const runEStop = () => {
        setEmergencyStatus(true);
        setAutoPilot(false);
        IoTProxy.actuate(nodeId, 0, 'STOP', 0);
        setActiveMission(null);
        setCompletedMissions(p => [`!!! E-STOP TRIGGERED !!!`, ...p]);
        setTimeout(() => setEmergencyStatus(false), 5000);
    };

    // Auto-Pilot Cycle
    useEffect(() => {
        if (!autoPilot || isDosing || emergencyStatus) return;
        const checkid = setInterval(() => {
            const plan = planMission(true);
            if (plan && plan.length > 0) runMission(plan);
        }, 15000);
        return () => clearInterval(checkid);
    }, [autoPilot, isDosing, telemetry, selectedVariety, emergencyStatus]);

    return (
        <div className="oasis-dashboard">
            <style>{`
                :root { --sahara-sand: #e6be8a; --sahara-dusk: #c2410c; --oasis-teal: #14b8a6; --danger: #ef4444; }
                .oasis-dashboard { color: white; padding-bottom: 50px; font-family: 'Inter', sans-serif; }
                .sahara-glass { background: rgba(194, 65, 12, 0.05); backdrop-filter: blur(25px); border: 1px solid rgba(230, 190, 138, 0.1); border-radius: 32px; padding: 2rem; }
                
                .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .status-chip { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.4); padding: 8px 18px; border-radius: 100px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.05); }
                
                .main-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; }
                
                .variety-card { cursor: pointer; position: relative; background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 24px; border: 1px solid rgba(230, 190, 138, 0.15); transition: 0.3s; }
                .variety-card:hover { border-color: var(--sahara-sand); background: rgba(0,0,0,0.4); }
                
                .vault-dropdown { position: absolute; top: 105%; left: 0; right: 0; z-index: 1000; background: #0a0a0a; border-radius: 20px; border: 1px solid #333; max-height: 400px; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .vault-item { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 12px; transition: 0.2s; color: #888; font-weight: 500; cursor: pointer; border-bottom: 1px solid #1a1a1a; }
                .vault-item:hover { background: var(--sahara-dusk); color: white; }

                .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.2rem; margin-top: 1.5rem; }
                .stat-card { background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.03); }
                .stat-value { font-family: 'Orbitron'; font-size: 1.8rem; font-weight: 900; color: var(--sahara-sand); }
                .stat-label { font-size: 0.55rem; opacity: 0.5; letter-spacing: 2.5px; margin-top: 6px; font-weight: 700; }

                .auto-pilot-toggle { width: 100%; margin-top: 1.5rem; background: linear-gradient(135deg, #c2410c, #ea580c); color: white; padding: 1.2rem; border-radius: 20px; border: none; font-family: 'Orbitron'; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 800; font-size: 0.8rem; letter-spacing: 1px; transition: 0.3s; }
                .auto-pilot-toggle.active { background: linear-gradient(135deg, #14b8a6, #0d9488); box-shadow: 0 0 20px rgba(20, 184, 166, 0.3); }

                .estop-btn { position: fixed; bottom: 40px; right: 40px; width: 75px; height: 75px; border-radius: 50%; background: var(--danger); border: 6px solid rgba(255,255,255,0.1); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: pointer; box-shadow: 0 0 30px rgba(239, 68, 68, 0.3); z-index: 1000; transition: 0.2s; }
                .estop-btn:active { transform: scale(0.9); }
                
                .execution-card { background: rgba(0,0,0,0.4); border-radius: 24px; padding: 1.5rem; margin-top: 2rem; border: 1px solid rgba(255,255,255,0.05); }
                .progress-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 10px; overflow: hidden; }
                .progress-fill { height: 100%; background: var(--sahara-sand); transition: 0.05s linear; }
                
                .telemetry-orb { width: 100%; height: 180px; background: radial-gradient(circle at center, rgba(194, 65, 12, 0.1) 0%, transparent 65%); position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
                .orb-active { position: absolute; width: 110px; height: 110px; border-radius: 50%; border: 1px dashed rgba(230, 190, 138, 0.3); animation: rotate 12s linear infinite; }
                
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .blink { animation: blink 1.2s infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>

            <header className="header-flex">
                <div>
                    <h1 className="orbitron" style={{ fontSize: '1.6rem', letterSpacing: '5px', background: 'linear-gradient(to right, #e6be8a, #c2410c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AGROCORE</h1>
                    <p style={{ opacity: 0.4, fontWeight: 800, fontSize: '0.65rem', letterSpacing: '1px' }}>ALGERIAN AUTONOMY • {nodeId}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="status-chip" style={{ borderColor: isCloudLinked ? 'rgba(20, 184, 166, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
                        <div className={`pulse-glow ${isCloudLinked ? '' : 'blink'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: isCloudLinked ? '#14b8a6' : '#ef4444' }} />
                        {isCloudLinked ? 'NEXUS LINKED' : 'NEXUS STALLED'}
                    </div>
                    <div className="status-chip">
                        <RiTimerFlashLine color="var(--sahara-sand)" />
                        SAFETY: 5s CAP
                    </div>
                </div>
            </header>

            <main className="main-grid">
                <div className="oracle-side">
                    <div className="sahara-glass">
                        <div className="variety-card" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                <div style={{ fontSize: '2.2rem', color: 'var(--sahara-sand)' }}>{selectedVariety.icon}</div>
                                <div>
                                    <div className="orbitron" style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '1px' }}>{selectedVariety.name}</div>
                                    <div style={{ fontSize: '0.55rem', opacity: 0.4, letterSpacing: '2px' }}>HERITAGE ARCHIVE V.1</div>
                                </div>
                            </div>

                            {isSearchOpen && (
                                <div className="vault-dropdown">
                                    <div style={{ padding: '1rem', background: '#111' }}>
                                        <input autoFocus placeholder="SEARCH VAULT..." style={{ width: '100%', background: '#000', border: '1px solid #333', color: 'white', padding: '0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontFamily: 'Orbitron' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onClick={e => e.stopPropagation()} />
                                    </div>
                                    {Object.entries(filteredVault).map(([cat, items]) => (
                                        <div key={cat}>
                                            <div style={{ fontSize: '0.5rem', padding: '8px 20px', background: '#111', letterSpacing: '3px', color: '#555', fontWeight: 900 }}>{cat}</div>
                                            {items.map(item => (
                                                <div className="vault-item" key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedVariety(item); setIsSearchOpen(false); }}>
                                                    {item.icon} <span style={{ fontSize: '0.75rem' }}>{item.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="stat-grid">
                            <div className="stat-card">
                                <div className="stat-label">TARGET PH</div>
                                <div className="stat-value">{selectedVariety.ph}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">TARGET EC</div>
                                <div className="stat-value">{selectedVariety.ec}</div>
                            </div>
                        </div>

                        <button className={`auto-pilot-toggle ${autoPilot ? 'active' : ''}`} onClick={() => setAutoPilot(!autoPilot)}>
                            <RiRadarLine className={autoPilot ? 'blink' : ''} />
                            <span>{autoPilot ? 'AUTO-PILOT ACTIVE' : 'ENGAGE NEURAL AUTO-PILOT'}</span>
                        </button>
                    </div>
                </div>

                <div className="monitor-side">
                    <div className="sahara-glass" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="telemetry-orb">
                            <div className="orb-active" />
                            <div style={{ textAlign: 'center', zIndex: 10 }}>
                                <div className="stat-value" style={{ fontSize: '3.2rem', color: Math.abs(telemetry.ph - selectedVariety.ph) > 0.3 ? 'var(--danger)' : 'var(--oasis-teal)' }}>{telemetry.ph.toFixed(2)}</div>
                                <div className="stat-label">LIVE FEEDBACK PH</div>
                            </div>
                        </div>

                        <div className="stat-grid" style={{ marginTop: '0' }}>
                            <div className="stat-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                <div className="stat-label">LIVE EC</div>
                                <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--oasis-teal)' }}>{telemetry.ec.toFixed(2)}</div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                <div className="stat-label">ACTUATOR SYNC</div>
                                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{isCloudLinked ? 'STABLE' : 'LOST'}</div>
                            </div>
                        </div>

                        {/* EXECUTION STACK */}
                        <div className="execution-stack" style={{ flex: 1, marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', opacity: 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RiCpuLine />
                                    <span className="orbitron" style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '2px' }}>NEURAL EXECUTION STACK</span>
                                </div>
                                <div style={{ fontSize: '0.5rem', fontWeight: 900 }}><RiShieldCheckLine color="#14b8a6" /> 5.0S LIMIT ACTIVE</div>
                            </div>

                            {activeMission ? (
                                <div className="execution-card" style={{ borderLeft: '4px solid var(--sahara-sand)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div className="orbitron" style={{ fontSize: '0.8rem', fontWeight: 900 }}>{activeMission.name}</div>
                                            <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '2px' }}>{activeMission.reason}</div>
                                        </div>
                                        <div className="orbitron" style={{ fontSize: '0.9rem', color: 'var(--sahara-sand)' }}>
                                            {(activeMission.remaining / 1000).toFixed(1)}s
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${(activeMission.remaining / activeMission.duration) * 100}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {completedMissions.length > 0 ? (
                                        completedMissions.map((log, i) => (
                                            <div key={i} style={{ fontSize: '0.65rem', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '2px solid var(--sahara-dusk)', opacity: 1 - (i * 0.15) }}>{log}</div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.2, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '2px' }}>AWAITING NEXT HEARTBEAT...</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <div className="estop-btn" onClick={runEStop} title="EMERGENCY STOP">
                <RiAlertLine />
            </div>

            {/* MISSION PLAN POPUP */}
            {missionPlan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
                    <div className="sahara-glass" style={{ maxWidth: '480px', width: '100%', background: '#0a0a0a', border: '1px solid var(--sahara-dusk)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
                            <RiCpuLine size="1.5rem" color="var(--sahara-sand)" />
                            <div>
                                <h3 className="orbitron" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>MISSION PREVIEW</h3>
                                <div style={{ fontSize: '0.55rem', opacity: 0.4, letterSpacing: '2px' }}>HARDWARE SAFETY ENGAGED (MAX 5.0S)</div>
                            </div>
                        </div>

                        {missionPlan.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#111', borderRadius: '18px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ color: 'var(--sahara-sand)', fontSize: '1.5rem' }}>{step.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.5px' }}>{step.name}</div>
                                        <div className="orbitron" style={{ fontSize: '0.75rem', color: step.duration >= 5000 ? 'var(--danger)' : '#14b8a6' }}>{(step.duration / 1000).toFixed(2)}s</div>
                                    </div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '4px' }}>{step.reason}</div>
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginTop: '2rem' }}>
                            <button className="auto-pilot-toggle" style={{ background: '#222', marginTop: 0 }} onClick={() => setMissionPlan(null)}>ABORT</button>
                            <button className="auto-pilot-toggle" style={{ background: 'var(--sahara-dusk)', marginTop: 0 }} onClick={() => runMission()}>CONFIRM MISSION</button>
                        </div>
                    </div>
                </div>
            )}

            {!autoPilot && !missionPlan && (
                <button
                    className="auto-pilot-toggle"
                    style={{ position: 'fixed', bottom: '130px', right: '40px', width: 'auto', padding: '1rem 2.5rem', zIndex: 100, fontSize: '0.7rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                    onClick={() => planMission()}
                >
                    <RiPlayCircleLine size="1.2rem" /> RUN MANUAL DIAGNOSTIC
                </button>
            )}
        </div>
    );
};

export default Hydroponics;
