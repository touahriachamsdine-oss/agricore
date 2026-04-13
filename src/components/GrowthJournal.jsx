import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useI18n } from '../context/i18nContext';
import {
    RiTimeLine,
    RiInformationLine,
    RiHistoryLine,
    RiCameraLensLine,
    RiScanLine,
    RiScan2Line,
    RiLeafLine,
    RiShieldCrossLine
} from 'react-icons/ri';
import { VisionAI } from '../services/VisionAI';

const GrowthJournal = () => {
    const { journalEntries, setJournalEntries } = usePlatform();
    const { t } = useI18n();

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const handleNewScan = async () => {
        setIsScanning(true);
        setScanProgress(0);

        // Progress animation
        const timer = setInterval(() => {
            setScanProgress(p => p < 95 ? p + Math.random() * 5 : p);
        }, 150);

        try {
            const report = await VisionAI.scan('mock_data');
            clearInterval(timer);
            setScanProgress(100);

            // Add new entry with mass/health results
            const newEntry = {
                id: Date.now(),
                plantId: 1, // Default to Tomato for demo
                date: new Date().toLocaleString(),
                observation: `Vision Scan: ${report.stage} stage detected. Leaf Mass Index: ${report.massIndex} LMI.`,
                aiNote: `${report.diagnosis} (${report.severity}). Advice: ${report.advice}`,
                image: 'https://images.unsplash.com/photo-1599940824399-b87987cb5733?auto=format&fit=crop&w=400&q=80',
                stats: {
                    lmi: report.massIndex,
                    confidence: report.confidence,
                    health: report.severity === 'NONE' ? 98 : (report.severity === 'MODERATE' ? 65 : 30)
                }
            };

            setTimeout(() => {
                setJournalEntries([newEntry, ...journalEntries]);
                setIsScanning(false);
            }, 500);

        } catch (e) {
            clearInterval(timer);
            setIsScanning(false);
        }
    };

    return (
        <div className="journal-view animate-fade">
            <style>{`
                .scanner-overlay { position: relative; overflow: hidden; border-radius: 16px; background: #000; height: 250px; margin-bottom: var(--spacing-lg); }
                .scanner-beam { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--primary); box-shadow: 0 0 20px var(--primary); animation: scan 2s infinite ease-in-out; z-index: 10; }
                @keyframes scan { 0% { top: 0% } 50% { top: 100% } 100% { top: 0% } }
                .scan-btn { background: var(--primary); color: var(--bg-deep); border: none; padding: 1rem 2rem; border-radius: 12px; font-family: var(--font-header); font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; width: 100%; justify-content: center; }
                .scan-btn:hover { transform: scale(1.02); box-shadow: var(--shadow-lg); }
                .stat-tag { font-size: 0.6rem; padding: 4px 10px; border-radius: 20px; background: rgba(0,0,0,0.1); border: 1px solid var(--glass-border); font-weight: 900; }
            `}</style>

            <header style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 className="glow-text-primary">{t('journal').toUpperCase()}</h2>
                    <p className="text-dim">Temporal continuity established. Vision-AI enabled.</p>
                </div>
            </header>

            {!isScanning ? (
                <button className="scan-btn" onClick={handleNewScan} style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <RiCameraLensLine size="1.4rem" />
                    INITIATE NEURAL SIGHT SCAN
                </button>
            ) : (
                <div className="scanner-overlay glass-panel animate-fade">
                    <div className="scanner-beam" />
                    <img src="https://images.unsplash.com/photo-1599940824399-b87987cb5733?auto=format&fit=crop&w=800&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt="Scanning" />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 5 }}>
                        <RiScan2Line size="3rem" className="animate-pulse" color="var(--primary)" />
                        <div className="orbitron" style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--primary)', letterSpacing: '4px' }}>ANALYZING TISSUE... {Math.round(scanProgress)}%</div>
                    </div>
                </div>
            )}

            <div className="journal-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', borderLeft: '2px solid var(--glass-border)', paddingLeft: 'var(--spacing-lg)', marginLeft: '10px' }}>
                {journalEntries.map(entry => (
                    <div key={entry.id} className="journal-entry glass-panel animate-slide-up" style={{ padding: 'var(--spacing-md)', position: 'relative' }}>
                        {/* Timeline Marker */}
                        <div style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', left: '-30px', top: '25px', boxShadow: '0 0 10px var(--primary)' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 className="orbitron" style={{ fontSize: '0.9rem' }}>OBSERVATION NODE {entry.id.toString().substr(-4)}</h3>
                                {entry.stats && (
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <span className="stat-tag" style={{ color: 'var(--secondary)' }}><RiLeafLine /> LMI: {entry.stats.lmi}</span>
                                        <span className="stat-tag" style={{ color: entry.stats.health > 80 ? 'var(--primary)' : '#ef4444' }}><RiShieldCrossLine /> HEALTH: {entry.stats.health}%</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-dim" style={{ fontSize: '0.7rem' }}>{entry.date}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <div style={{ width: '120px', height: '120px', background: '#111', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                <img src={entry.image} alt="Observation" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)', lineHeight: 1.5 }}>{entry.observation}</p>

                                <div className={`diagnosis-card ${entry.aiNote.includes('Critical') ? 'critical-glow' : ''}`} style={{
                                    padding: 'var(--spacing-sm)',
                                    background: 'rgba(0,0,0,0.15)',
                                    borderLeft: `3px solid ${entry.aiNote.includes('Progression') || entry.aiNote.includes('Critical') ? '#ef4444' : 'var(--primary)'}`,
                                    borderRadius: '4px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', color: entry.aiNote.includes('Progression') || entry.aiNote.includes('Critical') ? '#ef4444' : 'var(--primary)', marginBottom: '4px', fontWeight: 900 }}>
                                        {entry.aiNote.includes('Progression') ? <RiHistoryLine /> : <RiInformationLine />}
                                        <span>{entry.aiNote.includes('Progression') ? t('progression_log') : 'NEURAL DIAGNOSIS'}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.9 }}>{entry.aiNote}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrowthJournal;
