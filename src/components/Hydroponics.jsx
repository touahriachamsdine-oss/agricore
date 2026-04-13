import React, { useState, useEffect, useMemo } from 'react';
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
    RiCloseCircleLine
} from 'react-icons/ri';
import { useI18n } from '../context/i18nContext';
import { IoTProxy } from '../services/IoTProxy';

const MASTER_VAULT = {
    "LEAFY GREENS": [
        { id: 'let-ll', name: 'Lettuce (Loose Leaf)', ph: 6.0, ec: 1.0, icon: <RiLeafLine /> },
        { id: 'let-rm', name: 'Lettuce (Romaine)', ph: 6.2, ec: 1.2, icon: <RiLeafLine /> },
        { id: 'spin', name: 'Spinach', ph: 6.5, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'kale', name: 'Kale (Curly)', ph: 6.0, ec: 2.0, icon: <RiLeafLine /> },
        { id: 'arug', name: 'Arugula', ph: 6.0, ec: 1.4, icon: <RiLeafLine /> },
        { id: 'chard', name: 'Swiss Chard', ph: 6.2, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'bok', name: 'Bok Choy', ph: 6.5, ec: 2.0, icon: <RiLeafLine /> },
    ],
    "HERBS": [
        { id: 'bas-it', name: 'Basil (Italian)', ph: 6.0, ec: 1.6, icon: <RiLeafLine /> },
        { id: 'bas-th', name: 'Basil (Thai)', ph: 6.2, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'mint', name: 'Mint (Peppermint)', ph: 6.5, ec: 2.2, icon: <RiLeafLine /> },
        { id: 'cil', name: 'Cilantro', ph: 6.0, ec: 1.4, icon: <RiLeafLine /> },
        { id: 'pars', name: 'Parsley', ph: 6.0, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'chive', name: 'Chives', ph: 6.2, ec: 1.8, icon: <RiLeafLine /> },
        { id: 'dill', name: 'Dill', ph: 5.8, ec: 1.2, icon: <RiLeafLine /> },
    ],
    "FRUITING": [
        { id: 'tom-ch', name: 'Tomato (Cherry)', ph: 6.2, ec: 2.5, icon: <RiFocus3Line /> },
        { id: 'tom-bf', name: 'Tomato (Beefsteak)', ph: 6.4, ec: 3.0, icon: <RiFocus3Line /> },
        { id: 'pep-bl', name: 'Pepper (Bell)', ph: 6.0, ec: 2.2, icon: <RiFocus3Line /> },
        { id: 'pep-ha', name: 'Pepper (Habanero)', ph: 6.2, ec: 2.4, icon: <RiFocus3Line /> },
        { id: 'cuc', name: 'Cucumber', ph: 5.8, ec: 2.0, icon: <RiFocus3Line /> },
        { id: 'strw', name: 'Strawberry', ph: 6.0, ec: 1.8, icon: <RiFocus3Line /> },
    ],
    "COLE CROPS": [
        { id: 'broc', name: 'Broccoli', ph: 6.5, ec: 2.8, icon: <RiFocus3Line /> },
        { id: 'cabb', name: 'Cabbage', ph: 6.8, ec: 2.5, icon: <RiFocus3Line /> },
    ]
};

const Hydroponics = () => {
    const { t } = useI18n();

    // VARIETAL STATE
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVariety, setSelectedVariety] = useState(MASTER_VAULT["LEAFY GREENS"][0]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // TELEMETRY
    const [currentPH, setCurrentPH] = useState(7.0);
    const [currentEC, setCurrentEC] = useState(1.0);

    // ACTUATION
    const [missionPlan, setMissionPlan] = useState(null);
    const [isDosing, setIsDosing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [activeRelay, setActiveRelay] = useState(null);

    // NETWORK
    const [nodeId, setNodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [esp32Ip, setEsp32Ip] = useState(localStorage.getItem('agro_node_ip') || '192.168.1.185');
    const [isCloudLinked, setIsCloudLinked] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        IoTProxy.connect(nodeId, setIsCloudLinked);
        const check = async () => { setIsOnline((await IoTProxy.checkLink(esp32Ip)).online); };
        check();
        const tid = setInterval(check, 10000);
        return () => clearInterval(tid);
    }, [nodeId, esp32Ip]);

    const filteredVault = useMemo(() => {
        const result = {};
        Object.entries(MASTER_VAULT).forEach(([category, items]) => {
            const matches = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
            if (matches.length > 0) result[category] = matches;
        });
        return result;
    }, [searchTerm]);

    const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 4)]);

    const planMission = () => {
        const plan = [];
        // PH Pulse: 375ms per 0.1 PH delta (1/4 scale of 1500)
        if (currentPH > selectedVariety.ph) {
            const delta = currentPH - selectedVariety.ph;
            const duration = Math.round(delta * 10 * 375);
            plan.push({ relay: 1, name: 'PH DOWN', duration, icon: <RiFlaskLine />, reason: `PH high (+${delta.toFixed(2)})` });
        }

        // EC Pulse: 500ms per 0.1 EC delta (1/4 scale of 2000)
        if (currentEC < selectedVariety.ec) {
            const delta = selectedVariety.ec - currentEC;
            const duration = Math.round(delta * 10 * 500);
            plan.push({ relay: 2, name: 'NUTRIENT A', duration, icon: <RiPulseLine />, reason: `EC deficit (-${delta.toFixed(2)})` });
            plan.push({ relay: 3, name: 'NUTRIENT B', duration, icon: <RiPulseLine />, reason: `EC deficit (-${delta.toFixed(2)})` });
        }

        if (plan.length === 0) {
            addLog("ANALYSIS: System state within botanical limits.");
        } else {
            setMissionPlan(plan);
        }
    };

    const runMission = async () => {
        if (isDosing || !missionPlan) return;
        setIsDosing(true);
        const targetId = isCloudLinked ? nodeId : esp32Ip;

        try {
            for (const step of missionPlan) {
                if (step.duration <= 0) continue;
                addLog(`EXECUTING: ${step.name} for ${step.duration}ms`);
                setActiveRelay(step.relay);
                await IoTProxy.actuate(targetId, step.relay, 'ON', step.duration);
                await new Promise(r => setTimeout(r, step.duration + 1000));
                setActiveRelay(null);
            }
            addLog("MISSION COMPLETE: Neural state normalized.");
            setMissionPlan(null);
        } catch (err) {
            addLog("ERROR: Actuation failure.");
        } finally {
            setIsDosing(false);
        }
    };

    const runQuickTest = async () => {
        if (isDosing) return;
        setIsDosing(true);
        addLog("LINK TEST: Firing sequence [SOL A] for 500ms...");
        try {
            const targetId = isCloudLinked ? nodeId : esp32Ip;
            setActiveRelay(2);
            await IoTProxy.actuate(targetId, 2, 'ON', 500);
            await new Promise(r => setTimeout(r, 1500));
            addLog("TEST COMPLETE: Hardware responsive.");
        } catch (err) {
            addLog("TEST FAILED: Link stalling.");
        } finally {
            setIsDosing(false);
            setActiveRelay(null);
        }
    };

    return (
        <div className="oracle-dashboard animate-fade">
            <style>{`
                .oracle-dashboard { color: var(--primary); padding-bottom: 50px; }
                .glass-card { background: rgba(255,255,255,0.02); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
                
                .oracle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
                .node-badge { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); padding: 8px 20px; border-radius: 100px; border: 1px solid rgba(153, 173, 122, 0.2); font-size: 0.7rem; font-weight: 800; font-family: 'Orbitron'; }
                .status-pin { width: 8px; height: 8px; border-radius: 50%; }
                
                .main-oracle-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; }
                
                .variety-selector { cursor: pointer; position: relative; }
                .selector-display { display: flex; align-items: center; gap: 15px; padding: 1.5rem; background: rgba(153, 173, 122, 0.1); border-radius: 18px; border: 1px solid var(--secondary); transition: all 0.3s; }
                .selector-display:hover { background: rgba(153, 173, 122, 0.2); transform: scale(1.02); }
                .variety-icon { font-size: 2rem; color: var(--secondary); }
                
                .vault-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; margin-top: 10px; max-height: 400px; overflow-y: auto; background: #fffdf9; border-radius: 18px; border: 1px solid #ddd; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
                .vault-search { padding: 1rem; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; }
                .vault-search input { width: 100%; border: none; font-family: 'Orbitron'; font-size: 0.8rem; outline: none; color: black; }
                .vault-cat { font-size: 0.6rem; font-weight: 900; opacity: 0.4; padding: 1rem 1rem 0.5rem; letter-spacing: 2px; color: black; }
                .vault-item { padding: 0.8rem 1rem; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; font-size: 0.85rem; font-weight: 600; color: black; }
                .vault-item:hover { background: var(--secondary); color: white; }

                .stat-ring { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
                .ring-box { text-align: center; padding: 1rem; border-radius: 14px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); }
                .ring-val { font-family: 'Orbitron'; font-size: 1.2rem; font-weight: 900; color: var(--secondary); }
                .ring-lab { font-size: 0.55rem; font-weight: 900; opacity: 0.5; margin-top: 5px; }

                .telemetry-input { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; }
                .input-block label { display: block; font-size: 0.6rem; font-weight: 900; margin-bottom: 8px; opacity: 0.6; }
                .input-block input { width: 100%; background: white; border: 2px solid var(--accent); padding: 1rem; border-radius: 12px; font-family: 'Orbitron'; font-size: 1.1rem; color: var(--primary); }

                .mission-btn { width: 100%; margin-top: 2rem; padding: 1.2rem; border-radius: 14px; border: none; background: var(--primary); color: white; font-family: 'Orbitron'; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; }
                .mission-btn:hover { background: var(--secondary); box-shadow: 0 10px 25px rgba(153, 173, 122, 0.3); }

                .mission-plan-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; padding: 2rem; backdrop-filter: blur(5px); }
                .plan-card { width: 100%; max-width: 450px; background: white; border-radius: 24px; padding: 2rem; }
                .plan-header { margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
                .plan-step { display: flex; align-items: center; gap: 15px; padding: 12px; border-radius: 12px; background: #f9f9f9; margin-bottom: 10px; border: 1px solid #eee; }
                .step-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--secondary); color: white; display: flex; align-items: center; justify-content: center; }
                .step-info { flex: 1; }
                .step-title { font-weight: 800; font-size: 0.8rem; color: black; }
                .step-dur { font-size: 0.7rem; color: #888; font-weight: 700; }

                .relay-mon { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem; }
                .relay-card { padding: 1rem; border-radius: 18px; border: 1px solid rgba(0,0,0,0.05); background: rgba(0,0,0,0.02); text-align: center; }
                .relay-card.active { border-color: var(--secondary); background: rgba(153, 173, 122, 0.15); animation: pulse-border 1s infinite alternate; }
                
                @keyframes pulse-border { from { border-color: transparent; } to { border-color: var(--secondary); } }
                .spin { animation: rotate 2s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <header className="oracle-header">
                <div>
                    <h2 className="orbitron glow-text-primary">BOTANICAL ORACLE</h2>
                    <p className="text-dim">AGROCORE NEURAL FABRIC v4.0</p>
                </div>
                <div className="node-info" style={{ display: 'flex', gap: '15px' }}>
                    <div className="node-badge">
                        <div className="status-pin" style={{ background: isCloudLinked ? '#4CAF50' : '#c62828' }} />
                        CLOUD: {isCloudLinked ? 'STABLE' : 'STALLED'}
                    </div>
                    <div className="node-badge">
                        <div className="status-pin" style={{ background: isOnline ? '#4CAF50' : '#888' }} />
                        LOCAL: {isOnline ? 'STABLE' : 'STALLED'}
                    </div>
                </div>
            </header>

            <main className="main-oracle-grid">
                {/* LEFT: ORACLE CONFIG */}
                <div className="oracle-controls">
                    <div className="glass-card">
                        <div className="variety-selector">
                            <label className="ring-lab" style={{ display: 'block', marginBottom: '10px' }}>ACTIVE SPECIES</label>
                            <div className="selector-display" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                                <span className="variety-icon">{selectedVariety.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div className="orbitron" style={{ fontWeight: 900 }}>{selectedVariety.name}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>SPECIES ID: {selectedVariety.id}</div>
                                </div>
                                <RiSearchEyeLine size={20} />
                            </div>

                            {isSearchOpen && (
                                <div className="vault-dropdown animate-fade-down">
                                    <div className="vault-search">
                                        <input
                                            autoFocus
                                            placeholder="SEARCH BOTANICAL VAULT..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {Object.entries(filteredVault).map(([cat, items]) => (
                                        <div key={cat}>
                                            <div className="vault-cat">{cat}</div>
                                            {items.map(item => (
                                                <div
                                                    className="vault-item"
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedVariety(item);
                                                        setIsSearchOpen(false);
                                                        setSearchTerm('');
                                                    }}
                                                >
                                                    {item.icon} {item.name}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="stat-ring">
                            <div className="ring-box">
                                <div className="ring-val">{selectedVariety.ph}</div>
                                <div className="ring-lab">TARGET PH</div>
                            </div>
                            <div className="ring-box">
                                <div className="ring-val">{selectedVariety.ec}</div>
                                <div className="ring-lab">TARGET EC</div>
                            </div>
                        </div>

                        <div className="telemetry-input">
                            <div className="input-block">
                                <label>MEASURED PH</label>
                                <input type="number" step="0.1" value={currentPH} onChange={e => setCurrentPH(parseFloat(e.target.value))} />
                            </div>
                            <div className="input-block">
                                <label>MEASURED EC</label>
                                <input type="number" step="0.1" value={currentEC} onChange={e => setCurrentEC(parseFloat(e.target.value))} />
                            </div>
                        </div>

                        <div className="mission-actions" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                            <button className="mission-btn" onClick={planMission}>
                                <RiPulseLine className={isDosing ? 'spin' : ''} />
                                <span>PLAN NEURAL MISSION</span>
                            </button>
                            <button className="mission-btn test-btn" onClick={runQuickTest} disabled={isDosing} style={{ marginTop: '2rem', height: 'auto', background: 'rgba(0,0,0,0.05)', color: 'var(--primary)', border: '1px solid #ddd' }}>
                                <RiCheckboxCircleLine />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: MONITOR & LOGS */}
                <div className="oracle-monitor">
                    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h4 className="orbitron" style={{ fontSize: '0.8rem', opacity: 0.4, marginBottom: '2rem' }}>ACTUATION MONITOR</h4>

                        <div className="relay-mon">
                            {[
                                { r: 1, n: 'PH DOWN', p: 'GPIO 4' },
                                { r: 2, n: 'SOL A', p: 'GPIO 5' },
                                { r: 3, n: 'SOL B', p: 'GPIO 6' }
                            ].map(relay => (
                                <div key={relay.r} className={`relay-card ${activeRelay === relay.r ? 'active' : ''}`}>
                                    <RiFlaskLine size={24} style={{ opacity: 0.3 }} />
                                    <div style={{ fontWeight: 900, fontSize: '0.7rem', marginTop: '10px' }}>{relay.n}</div>
                                    <div style={{ fontSize: '0.5rem', opacity: 0.4 }}>{relay.p}</div>
                                </div>
                            ))}
                        </div>

                        <div className="logs-panel" style={{ flex: 1, marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <RiHistoryLine className="icon-purple" />
                                <span className="orbitron" style={{ fontSize: '0.6rem', fontWeight: 900 }}>MISSION LOG</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {logs.map((l, i) => (
                                    <div key={i} style={{ fontSize: '0.7rem', fontFamily: 'monospace', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--secondary)' }}>{l}</div>
                                ))}
                                {logs.length === 0 && <div className="text-dim" style={{ fontStyle: 'italic', fontSize: '0.7rem' }}>Awaiting neural analysis...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MISSION PLAN POPUP */}
            {missionPlan && (
                <div className="mission-plan-overlay animate-fade">
                    <div className="plan-card animate-scale-up">
                        <header className="plan-header">
                            <h3 className="orbitron" style={{ color: 'black' }}>MISSION PREVIEW</h3>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888' }}>REASONING IDENTIFIED {missionPlan.length} ACTUATION STEPS</p>
                        </header>

                        <div className="plan-steps">
                            {missionPlan.map((step, i) => (
                                <div key={i} className="plan-step">
                                    <div className="step-icon">
                                        {step.icon}
                                    </div>
                                    <div className="step-info">
                                        <div className="step-title">{step.name}</div>
                                        <div className="step-dur" style={{ color: '#555' }}>{step.reason} • {(step.duration / 1000).toFixed(2)}s PULSE</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                            <button className="btn-primary" style={{ background: '#eee', color: '#000' }} onClick={() => setMissionPlan(null)}>
                                <RiCloseCircleLine /> CANCEL
                            </button>
                            <button className="btn-primary" style={{ background: 'var(--secondary)' }} onClick={runMission}>
                                <RiCheckboxCircleLine /> CONFIRM & ACTUATE
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hydroponics;
