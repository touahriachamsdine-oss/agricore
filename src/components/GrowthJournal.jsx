import React, { useState, useEffect, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useI18n } from '../context/i18nContext';
import {
    RiCameraLensLine,
    RiScanLine,
    RiScan2Line,
    RiLeafLine,
    RiShieldCrossLine,
    RiPulseLine,
    RiLightbulbLine
} from 'react-icons/ri';
import { VisionAI } from '../services/VisionAI';

const GrowthJournal = () => {
    const { journalEntries, setJournalEntries } = usePlatform();
    const { t } = useI18n();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [latestHint, setLatestHint] = useState(null);
    const [isMonitorActive, setIsMonitorActive] = useState(false);

    // Initial camera setup
    useEffect(() => {
        let stream = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
            }
        };

        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Autonomous Monitoring Loop
    useEffect(() => {
        let monitorInterval;
        if (isMonitorActive) {
            monitorInterval = setInterval(() => {
                captureAndAnalyze();
            }, 20000); // Scan every 20s
        }
        return () => clearInterval(monitorInterval);
    }, [isMonitorActive]);

    const captureAndAnalyze = async () => {
        if (isScanning) return;

        setIsScanning(true);
        setScanProgress(0);

        // Progress animation
        const timer = setInterval(() => {
            setScanProgress(p => p < 95 ? p + Math.random() * 8 : p);
        }, 100);

        try {
            // Capture frame from video
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas && video) {
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            const report = await VisionAI.scan('live_feed');
            clearInterval(timer);
            setScanProgress(100);

            const newEntry = {
                id: Date.now(),
                date: new Date().toLocaleTimeString(),
                observation: `Neural Pulse: ${report.stage} stage. LMI: ${report.massIndex}`,
                aiNote: report.advice,
                image: canvasRef.current ? canvasRef.current.toDataURL('image/jpeg') : '',
                stats: {
                    lmi: report.massIndex,
                    health: report.severity === 'NONE' ? 98 : (report.severity === 'MODERATE' ? 65 : 30)
                }
            };

            setLatestHint({
                text: report.advice,
                type: report.severity
            });

            setJournalEntries(prev => [newEntry, ...prev].slice(0, 10)); // Keep latest 10

            setTimeout(() => {
                setIsScanning(false);
                setScanProgress(0);
            }, 800);

        } catch (e) {
            clearInterval(timer);
            setIsScanning(false);
        }
    };

    return (
        <div className="journal-view animate-fade">
            <style>{`
                .camera-container { position: relative; border-radius: 20px; overflow: hidden; background: #000; height: 350px; border: 2px solid var(--glass-border); box-shadow: var(--shadow-lg); }
                .camera-feed { width: 100%; height: 100%; object-fit: cover; filter: sepia(0.2) saturate(1.2) contrast(1.1); }
                .camera-overlay { position: absolute; inset: 0; pointer-events: none; border: 20px solid rgba(0,0,0,0.2); }
                .scan-laser { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--primary); box-shadow: 0 0 15px var(--primary); animation: scan-loop 3s infinite ease-in-out; opacity: 0.8; }
                @keyframes scan-loop { 0% { top: 10% } 50% { top: 90% } 100% { top: 10% } }
                
                .hint-box { position: absolute; bottom: 20px; left: 20px; right: 20px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); padding: 15px; border-radius: 12px; border-left: 4px solid var(--primary); color: #fff; z-index: 100; display: flex; align-items: center; gap: 12px; animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .hint-critical { border-left-color: #ef4444; }

                .control-strip { display: flex; gap: 10px; margin-top: var(--spacing-md); margin-bottom: var(--spacing-lg); }
                .btn-pulse { flex: 1; padding: 12px; border-radius: 10px; border: none; font-family: var(--font-header); font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s; }
                .btn-primary { background: var(--primary); color: var(--bg-deep); }
                .btn-active { background: #ef4444; color: #fff; }
                .timeline-mini { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
                .mini-entry { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; position: relative; }
                .mini-entry img { width: 100%; height: 80px; object-fit: cover; opacity: 0.6; }
                .mini-info { padding: 8px; font-size: 0.65rem; }
            `}</style>

            <header style={{ marginBottom: 'var(--spacing-md)' }}>
                <h2 className="glow-text-primary">NEURAL SIGHT MONITOR</h2>
                <p className="text-dim">Live biological uplink active. Continuous path-scanning enabled.</p>
            </header>

            <div className="camera-container">
                <video ref={videoRef} autoPlay playsInline className="camera-feed" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {isMonitorActive && <div className="scan-laser" />}
                <div className="camera-overlay">
                    <div style={{ position: 'absolute', top: 15, right: 15, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isMonitorActive ? '#44ff44' : '#666', boxShadow: isMonitorActive ? '0 0 10px #44ff44' : 'none' }}></div>
                        <span className="orbitron" style={{ fontSize: '0.6rem', color: '#fff' }}>{isMonitorActive ? 'LIVE MONITORING' : 'IDLE'}</span>
                    </div>
                </div>

                {latestHint && (
                    <div className={`hint-box ${latestHint.type === 'CRITICAL' ? 'hint-critical' : ''}`}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', color: latestHint.type === 'CRITICAL' ? '#ef4444' : 'var(--primary)' }}>
                            <RiLightbulbLine size="1.2rem" />
                        </div>
                        <div>
                            <div className="orbitron" style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: '1px' }}>NEURAL HINT</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{latestHint.text}</div>
                        </div>
                    </div>
                )}

                {isScanning && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
                        <RiPulseLine size="3rem" className="animate-pulse" color="var(--primary)" />
                        <div className="orbitron" style={{ marginTop: '1rem', color: 'var(--primary)', fontSize: '0.8rem' }}>PROCESSING... {Math.round(scanProgress)}%</div>
                    </div>
                )}
            </div>

            <div className="control-strip">
                <button
                    className={`btn-pulse ${isMonitorActive ? 'btn-active' : 'btn-primary'}`}
                    onClick={() => setIsMonitorActive(!isMonitorActive)}
                >
                    <RiScan2Line />
                    {isMonitorActive ? 'DISENGAGE MONITOR' : 'ENGAGE LIVE MONITOR'}
                </button>
                <button className="btn-pulse" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={captureAndAnalyze}>
                    <RiCameraLensLine />
                    MANUAL PULSE
                </button>
            </div>

            <div className="history-section">
                <h3 className="orbitron" style={{ fontSize: '0.8rem', marginBottom: 'var(--spacing-sm)', opacity: 0.7 }}>RECENT PULSES</h3>
                <div className="timeline-mini">
                    {journalEntries.length === 0 && <p className="text-dim" style={{ fontSize: '0.8rem' }}>No pulses captured yet. Engage monitor to start.</p>}
                    {journalEntries.map(entry => (
                        <div key={entry.id} className="mini-entry animate-slide-up">
                            <img src={entry.image} alt="Pulse" />
                            <div className="mini-info">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 800 }}>{entry.date}</span>
                                    <span style={{ color: entry.stats.health > 80 ? 'var(--primary)' : '#ef4444' }}>{entry.stats.health}%</span>
                                </div>
                                <p style={{ opacity: 0.7, fontSize: '0.6rem' }}>{entry.observation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GrowthJournal;
