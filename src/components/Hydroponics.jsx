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
import { GiSprout, GiHypodermicTest } from 'react-icons/gi';
import { BiTransfer } from 'react-icons/bi';
import { useI18n } from '../context/i18nContext';
import { IoTProxy } from '../services/IoTProxy';

// Varietal Database: Categorized botanical profiles
const PLANT_DATABASE = [
    {
        category: 'Leafy Greens',
        types: [
            {
                name: 'Lettuce',
                subtypes: [
                    { id: 'let_romaine', name: 'Romaine', ph: 6.0, ec: 1.2, doseA: 300, doseB: 300 },
                    { id: 'let_bibb', name: 'Bibb / Butterhead', ph: 6.0, ec: 0.9, doseA: 200, doseB: 200 },
                    { id: 'let_iceberg', name: 'Iceberg', ph: 6.5, ec: 1.1, doseA: 300, doseB: 300 }
                ]
            },
            {
                name: 'Spinach',
                subtypes: [
                    { id: 'spi_standard', name: 'Standard Leaf', ph: 5.5, ec: 1.8, doseA: 400, doseB: 400 },
                    { id: 'spi_baby', name: 'Baby Spinach', ph: 6.0, ec: 1.5, doseA: 300, doseB: 300 }
                ]
            }
        ]
    },
    {
        category: 'Fruiting',
        types: [
            {
                name: 'Tomato',
                subtypes: [
                    { id: 'tom_cherry', name: 'Cherry (Sweet)', ph: 6.2, ec: 2.2, doseA: 500, doseB: 500 },
                    { id: 'tom_beef', name: 'Beefsteak', ph: 6.5, ec: 2.5, doseA: 600, doseB: 600 },
                    { id: 'tom_heir', name: 'Heirloom', ph: 6.3, ec: 2.3, doseA: 550, doseB: 550 }
                ]
            },
            {
                name: 'Strawberry',
                subtypes: [
                    { id: 'str_albion', name: 'Albion', ph: 5.8, ec: 1.4, doseA: 300, doseB: 300 },
                    { id: 'str_seasc', name: 'Seascape', ph: 6.0, ec: 1.6, doseA: 350, doseB: 350 }
                ]
            }
        ]
    }
];

const Hydroponics = () => {
    const { t } = useI18n();

    // VARIETAL STATE
    const [selectedSubtype, setSelectedSubtype] = useState(PLANT_DATABASE[0].types[0].subtypes[0]);
    const [currentPH, setCurrentPH] = useState(7.0);
    const [currentEC, setCurrentEC] = useState(1.0);

    // CONNECTIVITY STATE
    const [esp32Ip, setEsp32Ip] = useState(localStorage.getItem('agro_node_ip') || '192.168.1.185');
    const [nodeId, setNodeId] = useState(localStorage.getItem('agro_node_id') || 'AGRO_NODE_01');
    const [isOnline, setIsOnline] = useState(false);
    const [isCloudLinked, setIsCloudLinked] = useState(false);

    // ACTUATION CONFIG (Calibration)
    const [phFactor, setPhFactor] = useState(1500); // ms per 0.1 PH delta
    const [ecFactor, setEcFactor] = useState(2000); // ms per 0.1 EC delta
    const [maxPulse, setMaxPulse] = useState(8000); // max duration safety cap (ms)

    // ACTUATION STATE
    const [isDosing, setIsDosing] = useState(false);
    const [activeRelay, setActiveRelay] = useState(null);
    const [logs, setLogs] = useState([]);

    // Establish Neural Heartbeat & Cloud Link
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

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 7)]);
    };

    const manualPulse = async (relay, duration = 3000) => {
        const targetId = isCloudLinked ? nodeId : esp32Ip;
        addLog(`MANUAL OVERRIDE: Pulsing Relay ${relay}...`);
        setActiveRelay(relay);
        await IoTProxy.actuate(targetId, relay, 'ON', duration);
        setTimeout(() => setActiveRelay(null), duration);
        addLog(`OVERRIDE COMPLETE: Relay ${relay} idle.`);
    };

    const runAIDosingCycle = async () => {
        if (isDosing) return;

        setIsDosing(true);
        addLog(`NEURAL ENGINE: Initializing Correction for ${selectedSubtype.name}...`);

        try {
            const targetId = isCloudLinked ? nodeId : esp32Ip;

            // 1. PH BALANCE (Relay 1)
            if (currentPH > selectedSubtype.ph) {
                const phDelta = currentPH - selectedSubtype.ph;
                // Calculate pulse based on user calibration (scaled per 0.1 delta)
                const calculatedPulse = Math.round((phDelta / 0.1) * phFactor);
                const finalPulse = Math.min(calculatedPulse, maxPulse);

                addLog(`DECISION: High PH (+${phDelta.toFixed(2)}). Actuating PH Down for ${finalPulse}ms`);
                setActiveRelay(1);
                await IoTProxy.actuate(targetId, 1, 'ON', finalPulse);
                await new Promise(r => setTimeout(r, 1000 + finalPulse));
                setActiveRelay(null);
            }

            // 2. NUTRIENT BALANCE (Relay 2 & 3)
            if (currentEC < selectedSubtype.ec) {
                const ecDelta = selectedSubtype.ec - currentEC;
                const calculatedPulse = Math.round((ecDelta / 0.1) * ecFactor);
                const finalPulse = Math.min(calculatedPulse, maxPulse);

                addLog(`DECISION: Low EC identified (-${ecDelta.toFixed(2)}). Dosing A/B mix for ${finalPulse}ms`);

                setActiveRelay(2);
                await IoTProxy.actuate(targetId, 2, 'ON', finalPulse);
                await new Promise(r => setTimeout(r, 1000 + finalPulse));
                setActiveRelay(null);

                setActiveRelay(3);
                await IoTProxy.actuate(targetId, 3, 'ON', finalPulse);
                await new Promise(r => setTimeout(r, 1000 + finalPulse));
                setActiveRelay(null);
            }

            addLog(`NEURAL ENGINE: Varietal Sync Complete.`);
        } catch (err) {
            addLog(`ERROR: Actuation Link Failure.`);
        } finally {
            setIsDosing(false);
            setActiveRelay(null);
        }
    };

    return (
        <div className="hydro-module animate-fade">
            <header className="hydro-header">
                <div>
                    <h3 className="orbitron glow-text-primary" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>HYDROPONIC NEURAL PROXY</h3>
                    <p className="text-dim" style={{ fontSize: '0.85rem' }}>AI-DRIVEN VARIETAL INTELLIGENCE</p>
                </div>
                <div className="link-status-bar">
                    <div className="status-item">
                        <div className={`status-dot ${isCloudLinked ? 'pulse green' : 'red'}`}></div>
                        <span>CLOUD LINK</span>
                    </div>
                    <div className="status-divider"></div>
                    <div className="status-item">
                        <div className={`status-dot ${isOnline ? 'green' : 'gray'}`}></div>
                        <span>LOCAL LINK</span>
                    </div>
                </div>
            </header>

            <div className="hydro-layout">
                {/* LEFT: Knowledge & Telemetry */}
                <div className="intelligence-column">
                    <section className="variety-selector glass-panel">
                        <div className="card-header">
                            <GiSprout size={20} className="icon-green" />
                            <h4>VARIETAL SELECTOR</h4>
                        </div>
                        <div className="category-scroll">
                            {PLANT_DATABASE.map(cat => (
                                <div key={cat.category} className="category-group">
                                    <span className="group-label">{cat.category}</span>
                                    {cat.types.map(type => (
                                        <div key={type.name} className="type-row">
                                            <span className="type-label">{type.name}:</span>
                                            <div className="subtype-chips">
                                                {type.subtypes.map(st => (
                                                    <button
                                                        key={st.id}
                                                        className={`subtype-chip ${selectedSubtype.id === st.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedSubtype(st)}
                                                    >
                                                        {st.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="target-dashboard">
                            <div className="target-stat">
                                <label>TARGET PH</label>
                                <strong>{selectedSubtype.ph}</strong>
                            </div>
                            <div className="target-stat">
                                <label>TARGET EC</label>
                                <strong>{selectedSubtype.ec}<small>mS</small></strong>
                            </div>
                        </div>
                    </section>

                    <section className="telemetry-vault glass-panel">
                        <div className="card-header">
                            <GiHypodermicTest size={20} className="icon-blue" />
                            <h4>TELEMETRY VAULT</h4>
                        </div>
                        <div className="manual-inputs-grid">
                            <div className="input-box">
                                <label>CURRENT PH</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={currentPH}
                                    onChange={(e) => setCurrentPH(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="input-box">
                                <label>CURRENT EC</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={currentEC}
                                    onChange={(e) => setCurrentEC(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                        <button
                            className={`ai-pulse-btn ${isDosing ? 'active' : ''}`}
                            onClick={runAIDosingCycle}
                            disabled={isDosing}
                        >
                            {isDosing ? <RiPulseLine className="spin" /> : <RiPlayCircleLine />}
                            <span>{isDosing ? 'NEURAL SYNCING...' : 'AI RECALIBRATION'}</span>
                        </button>
                    </section>
                </div>

                {/* RIGHT: Console & Logs */}
                <div className="actuation-column">
                    <section className="hardware-console glass-panel">
                        <div className="card-header">
                            <BiTransfer size={20} />
                            <h4>HARDWARE CONSOLE</h4>
                        </div>
                        <div className="relay-grid">
                            {[
                                { id: 1, name: 'PH DOWN', pin: 'G4' },
                                { id: 2, name: 'NUTRIENT A', pin: 'G5' },
                                { id: 3, name: 'NUTRIENT B', pin: 'G6' }
                            ].map(r => (
                                <div key={r.id} className={`relay-card ${activeRelay === r.id ? 'active' : ''}`}>
                                    <div className="relay-meta">
                                        <span className="r-pin">{r.pin}</span>
                                        <span className="r-name">{r.name}</span>
                                    </div>
                                    <button
                                        className="pulse-trigger"
                                        onClick={() => manualPulse(r.id)}
                                        disabled={isDosing}
                                    >
                                        PULSE
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="network-pairing">
                            <div className="config-field">
                                <label>CLOUD ID</label>
                                <input value={nodeId} onChange={e => setNodeId(e.target.value)} />
                            </div>
                            <div className="config-field">
                                <label>LOCAL IP</label>
                                <input value={esp32Ip} onChange={e => setEsp32Ip(e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section className="hardware-tuning glass-panel">
                        <div className="card-header">
                            <RiSettings3Line size={20} className="icon-purple" />
                            <h4>HARDWARE TUNING</h4>
                        </div>
                        <div className="calibration-grid">
                            <div className="tune-field">
                                <label>PH PULSE RATE (ms / 0.1 Δ)</label>
                                <input
                                    type="number"
                                    value={phFactor}
                                    onChange={e => setPhFactor(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="tune-field">
                                <label>NUTRIENT RATE (ms / 0.1 Δ)</label>
                                <input
                                    type="number"
                                    value={ecFactor}
                                    onChange={e => setEcFactor(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="tune-field full">
                                <label>GLOBAL SAFETY CAP (MAX MS)</label>
                                <input
                                    type="number"
                                    value={maxPulse}
                                    onChange={e => setMaxPulse(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="ai-logic-log glass-panel">
                        <div className="log-container">
                            <div className="log-header">
                                <span>AI REASONING STREAM</span>
                                <button onClick={() => setLogs([])}>CLEAR</button>
                            </div>
                            <div className="log-body">
                                {logs.map((log, i) => (
                                    <div key={i} className={`log-row ${log.includes('ACTION') || log.includes('DECISION') ? 'highlight' : ''}`}>
                                        <span className="msg">{log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .hydro-module { padding: var(--spacing-lg); }
                .hydro-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem; }
                .link-status-bar { 
                    display: flex; gap: 12px; align-items: center; 
                    background: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 30px; 
                    font-size: 0.65rem; font-weight: 800; border: 1px solid var(--secondary);
                }
                .status-item { display: flex; align-items: center; gap: 6px; }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; }
                .status-dot.green { background: #4CAF50; box-shadow: 0 0 5px #4CAF50; }
                .status-dot.red { background: #c62828; }
                .status-dot.gray { background: #555; }
                .status-divider { width: 1px; height: 10px; background: rgba(255,255,255,0.1); }

                .hydro-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
                .intelligence-column, .actuation-column { display: flex; flexDirection: column; gap: 2rem; }

                .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
                .card-header h4 { font-family: 'Orbitron', sans-serif; font-size: 0.8rem; letter-spacing: 1px; color: var(--secondary); }

                .category-group { margin-bottom: 1rem; }
                .group-label { font-size: 0.6rem; font-weight: 900; opacity: 0.5; margin-bottom: 0.5rem; display: block; }
                .type-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
                .type-label { font-size: 0.75rem; font-weight: 700; min-width: 70px; }
                .subtype-chips { display: flex; gap: 5px; flex-wrap: wrap; }
                .subtype-chip { 
                    padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(153, 173, 122, 0.2);
                    background: rgba(153, 173, 122, 0.05); color: var(--primary); font-size: 0.7rem; cursor: pointer;
                }
                .subtype-chip.active { background: var(--secondary); color: #FFF8EC; border-color: var(--secondary); }

                .target-dashboard { 
                    display: flex; gap: 1rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); 
                }
                .target-stat { flex: 1; text-align: center; }
                .target-stat label { font-size: 0.6rem; font-weight: 900; opacity: 0.6; display: block; margin-bottom: 4px; }
                .target-stat strong { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--primary); }

                .manual-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
                .input-box input { 
                    width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(84, 107, 65, 0.2); 
                    background: white; font-family: 'Orbitron', sans-serif; font-weight: 800; text-align: center;
                }
                .ai-pulse-btn { 
                    width: 100%; padding: 1.2rem; border-radius: 12px; border: none; 
                    background: var(--primary); color: #FFF8EC; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer;
                }
                .ai-pulse-btn.active { background: var(--secondary); }

                .relay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.5rem; }
                .relay-card { 
                    padding: 15px; border-radius: 10px; background: rgba(0,0,0,0.02); text-align: center; border: 1px solid transparent; 
                    transition: all 0.3s;
                }
                .relay-card.active { background: rgba(153, 173, 122, 0.15); border-color: var(--secondary); animation: pulse-border 1s infinite; }
                .r-pin { font-size: 0.6rem; opacity: 0.5; display: block; }
                .r-name { font-size: 0.7rem; font-weight: 900; margin: 5px 0; display: block; }
                .pulse-trigger { width: 100%; padding: 6px; font-size: 0.6rem; font-weight: 800; border-radius: 4px; border: 1px solid #ddd; cursor: pointer; }

                .network-pairing { 
                    display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); 
                }
                .config-field label { font-size: 0.55rem; font-weight: 900; margin-bottom: 3px; display: block; }
                .config-field input { width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ddd; font-size: 0.7rem; font-weight: 700; color: var(--primary); }

                .calibration-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .tune-field.full { grid-column: span 2; }
                .tune-field label { font-size: 0.55rem; font-weight: 900; opacity: 0.6; display: block; margin-bottom: 5px; }
                .tune-field input { 
                    width: 100%; background: rgba(0,0,0,0.05); border: 1px solid #ddd; border-radius: 6px; padding: 8px;
                    font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: var(--primary); font-weight: 700;
                }

                .log-container { display: flex; flex-direction: column; height: 100%; min-height: 120px; }
                .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.7rem; font-weight: 900; opacity: 0.6; }
                .log-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
                .log-row { font-family: monospace; font-size: 0.7rem; padding: 8px; background: rgba(0,0,0,0.02); border-radius: 4px; border-left: 2px solid #ccc; }
                .log-row.highlight { background: rgba(153, 173, 122, 0.05); border-left-color: var(--secondary); }

                @keyframes pulse-border {
                    0% { border-color: var(--secondary); box-shadow: 0 0 0 0 rgba(153, 173, 122, 0.4); }
                    100% { border-color: var(--secondary); box-shadow: 0 0 0 10px rgba(153, 173, 122, 0); }
                }
            `}</style>
        </div>
    );
};

export default Hydroponics;
