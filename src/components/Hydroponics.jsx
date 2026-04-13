import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    RiSunLine
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

    // TELEMETRY (Live from ESP32)
    const [telemetry, setTelemetry] = useState({ ph: 7.0, ec: 1.0, p1: false, p2: false, p3: false, rssi: 0 });
    const [lastUplink, setLastUplink] = useState(Date.now());

    // AUTOMATION STATE
    const [autoPilot, setAutoPilot] = useState(false);
    const [missionPlan, setMissionPlan] = useState(null);
    const [isDosing, setIsDosing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [emergencyStatus, setEmergencyStatus] = useState(false);

    // NETWORK
    const [nodeId, setNodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [isCloudLinked, setIsCloudLinked] = useState(false);

    const addLog = useCallback((msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 5)]), []);

    useEffect(() => {
        IoTProxy.connect(nodeId, setIsCloudLinked);
        const subId = `agrocore/telemetry/${nodeId}`;

        // MQTT Telemetry Subscriber
        IoTProxy.client?.on('message', (topic, message) => {
            if (topic === subId) {
                try {
                    const data = JSON.parse(message.toString());
                    setTelemetry(data);
                    setLastUplink(Date.now());
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

        if (phDelta > 0.1) {
            const dur = Math.round(phDelta * 10 * 375);
            plan.push({ relay: 1, name: 'PH DOWN', duration: dur, icon: <RiFlaskLine />, reason: `PH HIGH (+${phDelta.toFixed(2)})` });
        }

        if (ecDelta > 0.1) {
            const dur = Math.round(ecDelta * 10 * 500);
            plan.push({ relay: 2, name: 'NUTRIENT A', duration: dur, icon: <RiPulseLine />, reason: `EC DEFICIT (-${ecDelta.toFixed(2)})` });
            plan.push({ relay: 3, name: 'NUTRIENT B', duration: dur, icon: <RiPulseLine />, reason: `EC DEFICIT (-${ecDelta.toFixed(2)})` });
        }

        if (plan.length > 0) {
            if (silent) return plan;
            setMissionPlan(plan);
        } else if (!silent) {
            addLog("ANALYSIS: System state within botanical limits.");
        }
    };

    const runMission = async (p = missionPlan) => {
        if (isDosing || !p || emergencyStatus) return;
        setIsDosing(true);
        setMissionPlan(null);

        try {
            for (const step of p) {
                if (emergencyStatus) break;
                addLog(`EXECUTING: ${step.name} (${(step.duration / 1000).toFixed(1)}s)`);
                await IoTProxy.actuate(nodeId, step.relay, 'ON', step.duration);
                await new Promise(r => setTimeout(r, step.duration + 2000));
            }
            if (!emergencyStatus) addLog("MISSION COMPLETE: State normalized.");
        } catch (err) {
            addLog("ERROR: Actuation bridge interrupted.");
        } finally {
            setIsDosing(false);
        }
    };

    const runEStop = () => {
        setEmergencyStatus(true);
        setAutoPilot(false);
        IoTProxy.actuate(nodeId, 0, 'STOP', 0); // Special stop command
        addLog("!!! EMERGENCY STOP ACTIVE !!!");
        setTimeout(() => setEmergencyStatus(false), 5000);
    };

    // Auto-Pilot Control Loop
    useEffect(() => {
        if (!autoPilot || isDosing || emergencyStatus) return;

        const checkid = setInterval(() => {
            const plan = planMission(true);
            if (plan && plan.length > 0) {
                addLog("AUTO-PILOT: Deficit detected. Executing corrective pulses...");
                runMission(plan);
            }
        }, 30000); // Check every 30s

        return () => clearInterval(checkid);
    }, [autoPilot, isDosing, telemetry, selectedVariety, emergencyStatus, runMission]);

    return (
        <div className="oasis-dashboard animate-fade">
            <style>{`
                :root { --sahara-sand: #e6be8a; --sahara-dusk: #c2410c; --oasis-teal: #14b8a6; }
                .oasis-dashboard { color: white; padding-bottom: 50px; font-family: 'Inter', sans-serif; }
                .sahara-glass { background: rgba(194, 65, 12, 0.05); backdrop-filter: blur(20px); border: 1px solid rgba(230, 190, 138, 0.1); border-radius: 32px; padding: 2.5rem; }
                
                .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
                .status-chip { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); padding: 8px 18px; border-radius: 100px; font-size: 0.65rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.05); }
                .pulse-glow { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
                
                .main-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2.5rem; }
                
                .variety-card { cursor: pointer; position: relative; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 24px; border: 1px solid rgba(230, 190, 138, 0.2); transition: 0.3s; }
                .variety-card:hover { border-color: var(--sahara-sand); transform: translateY(-3px); }
                
                .vault-dropdown { position: absolute; top: 105%; left: 0; right: 0; z-index: 1000; background: #1a1a1a; border-radius: 20px; border: 1px solid #333; max-height: 500px; overflow-y: auto; }
                .vault-search { padding: 1.2rem; border-bottom: 1px solid #222; }
                .vault-search input { width: 100%; background: #000; border: 1px solid #444; color: white; padding: 0.8rem; border-radius: 12px; font-family: 'Orbitron'; font-size: 0.75rem; }
                .vault-item { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 12px; transition: 0.2s; color: #aaa; font-weight: 500; cursor: pointer; }
                .vault-item:hover { background: var(--sahara-dusk); color: white; }

                .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 2rem; }
                .stat-card { background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
                .stat-value { font-family: 'Orbitron'; font-size: 2rem; font-weight: 900; color: var(--sahara-sand); }
                .stat-label { font-size: 0.6rem; opacity: 0.4; letter-spacing: 2px; margin-top: 5px; }

                .auto-pilot-toggle { width: 100%; margin-top: 2rem; background: linear-gradient(135deg, #c2410c, #ea580c); color: white; padding: 1.5rem; border-radius: 20px; border: none; font-family: 'Orbitron'; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: 0.3s; }
                .auto-pilot-toggle.active { background: linear-gradient(135deg, #14b8a6, #0d9488); }
                .auto-pilot-toggle:hover { opacity: 0.9; transform: scale(0.98); }

                .estop-btn { position: fixed; bottom: 40px; right: 40px; width: 80px; height: 80px; border-radius: 50%; background: #ef4444; border: 8px solid rgba(255,255,255,0.1); color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4); z-index: 1000; transition: 0.2s; }
                .estop-btn:active { transform: scale(0.9); }
                
                .telemetry-orb { width: 100%; height: 200px; background: radial-gradient(circle at center, rgba(194, 65, 12, 0.1) 0%, transparent 70%); position: relative; margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; }
                .orb-active { position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 2px dashed rgba(230, 190, 138, 0.3); animation: rotate 10s linear infinite; }
                
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .blink { animation: blink 1s infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>

            <header className="header-flex">
                <div>
                    <h1 className="orbitron sahara-glow-text" style={{ fontSize: '1.8rem', letterSpacing: '4px' }}>ALGERIAN OASIS</h1>
                    <p style={{ opacity: 0.4, fontWeight: 800, fontSize: '0.7rem' }}>NEURAL FEEDBACK LOOP ACTIVE • {nodeId}</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="status-chip">
                        <div className="pulse-glow" style={{ color: isCloudLinked ? '#14b8a6' : '#ef4444' }} />
                        {isCloudLinked ? 'NEXUS LINKED' : 'NEXUS STALLED'}
                    </div>
                    <div className="status-chip">
                        <RiSunLine color="var(--sahara-sand)" />
                        {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </header>

            <main className="main-grid">
                {/* LEFT: SPECIES & TARGETS */}
                <div className="oracle-side">
                    <div className="sahara-glass">
                        <div className="variety-card" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ fontSize: '2.5rem', color: 'var(--sahara-sand)' }}>{selectedVariety.icon}</div>
                                <div>
                                    <div className="orbitron" style={{ fontWeight: 900, fontSize: '1.1rem' }}>{selectedVariety.name}</div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.4, letterSpacing: '2px' }}>SPECIES ID: {selectedVariety.id}</div>
                                </div>
                            </div>

                            {isSearchOpen && (
                                <div className="vault-dropdown">
                                    <div className="vault-search">
                                        <input autoFocus placeholder="SEARCH THE OASIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onClick={e => e.stopPropagation()} />
                                    </div>
                                    {Object.entries(filteredVault).map(([cat, items]) => (
                                        <div key={cat}>
                                            <div style={{ fontSize: '0.55rem', padding: '10px 20px', background: '#222', letterSpacing: '3px' }}>{cat}</div>
                                            {items.map(item => (
                                                <div className="vault-item" key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedVariety(item); setIsSearchOpen(false); }}>
                                                    {item.icon} {item.name}
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

                {/* RIGHT: LIVE TELEMETRY & FEEDBACK */}
                <div className="monitor-side">
                    <div className="sahara-glass" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="telemetry-orb">
                            <div className="orb-active" />
                            <div style={{ textAlign: 'center', z- index: 10 }}>
                            <div className="stat-value" style={{ fontSize: '3.5rem', color: telemetry.ph > selectedVariety.ph + 0.2 ? '#ef4444' : 'var(--oasis-teal)' }}>{telemetry.ph.toFixed(2)}</div>
                            <div className="stat-label">LIVE FEEDBACK PH</div>
                        </div>
                    </div>

                    <div className="stat-grid" style={{ marginTop: '0' }}>
                        <div className="stat-card">
                            <div className="stat-label">LIVE EC</div>
                            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--oasis-teal)' }}>{telemetry.ec.toFixed(2)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">UPLINK STRENGTH</div>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{telemetry.rssi} dBm</div>
                        </div>
                    </div>

                    <div className="mission-logs" style={{ flex: 1, marginTop: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', opacity: 0.5 }}>
                            <RiHistoryLine />
                            <span className="orbitron" style={{ fontSize: '0.65rem' }}>NEURAL STATE LOG</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {logs.map((l, i) => (
                                <div key={i} style={{ fontSize: '0.7rem', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '3px solid var(--sahara-dusk)' }}>{l}</div>
                            ))}
                            {logs.length === 0 && <div style={{ fontSize: '0.7rem', opacity: 0.3, fontStyle: 'italic' }}>Awaiting uplink sync...</div>}
                        </div>
                    </div>
                </div>
        </div>
            </main >

    {/* E-STOP BUTTON */ }
    < div className = "estop-btn" onClick = { runEStop } title = "EMERGENCY STOP" >
        <RiAlertLine />
            </div >

    {/* MISSION PLAN POPUP */ }
{
    missionPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justify- content: 'center', zIndex: 2000, padding: '2rem'
}}>
    <div className="sahara-glass" style={{ maxWidth: '500px', width: '100%', background: '#111' }}>
        <h3 className="orbitron" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>MISSION PREVIEW</h3>
        {missionPlan.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#222', borderRadius: '15px', marginBottom: '10px' }}>
                <div style={{ color: 'var(--sahara-sand)' }}>{step.icon}</div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{step.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>{step.reason} • {(step.duration / 1000).toFixed(2)}s</div>
                </div>
            </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginTop: '2rem' }}>
            <button className="auto-pilot-toggle" style={{ background: '#333' }} onClick={() => setMissionPlan(null)}>CANCEL</button>
            <button className="auto-pilot-toggle" style={{ background: 'var(--sahara-dusk)' }} onClick={() => runMission()}>CONFIRM MISSION</button>
        </div>
    </div>
                </div >
            )}

{
    !autoPilot && !missionPlan && (
        <button
            className="auto-pilot-toggle"
            style={{ position: 'fixed', bottom: '130px', right: '40px', width: 'auto', padding: '1rem 2rem', zIndex: 100 }}
            onClick={() => planMission()}
        >
            <RiPlayCircleLine /> MANUAL MISSION
        </button>
    )
}
        </div >
    );
};

export default Hydroponics;
