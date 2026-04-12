import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useI18n } from '../context/i18nContext';
import { RiTimeLine, RiInformationLine, RiHistoryLine } from 'react-icons/ri';

const GrowthJournal = () => {
    const { journalEntries } = usePlatform();
    const { t } = useI18n();

    return (
        <div className="journal-view">
            <header style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2 className="glow-text-primary">{t('journal').toUpperCase()}</h2>
                <p className="text-dim">Temporal continuity established. Linking observations to biological entities.</p>
            </header>

            <div className="journal-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', borderLeft: '2px solid var(--glass-border)', paddingLeft: 'var(--spacing-lg)', marginLeft: '10px' }}>
                {journalEntries.map(entry => (
                    <div key={entry.id} className="journal-entry glass-panel" style={{ padding: 'var(--spacing-md)', position: 'relative' }}>
                        {/* Timeline Marker */}
                        <div style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', left: '-30px', top: '25px', boxShadow: '0 0 10px var(--primary)' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                            <h3 className="orbitron">{t('tracker').toUpperCase() === 'CROP TRACKER' ? 'TOMATO' : 'طماطم'} {entry.plantId === 1 && entry.id === 2 ? `(${t('follow_up')})` : ''}</h3>
                            <span className="text-dim" style={{ fontSize: '0.7rem' }}>{entry.date}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <div style={{ width: '120px', height: '120px', background: '#111', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <img src={entry.image} alt="Observation" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>{entry.observation}</p>

                                <div className={`diagnosis-card ${entry.aiNote.includes('Progression') ? 'progression-alert' : ''}`} style={{
                                    padding: 'var(--spacing-sm)',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderLeft: `3px solid ${entry.aiNote.includes('Progression') ? 'var(--secondary)' : 'var(--primary)'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: entry.aiNote.includes('Progression') ? 'var(--secondary)' : 'var(--primary)', marginBottom: '4px' }}>
                                        {entry.aiNote.includes('Progression') ? <RiHistoryLine /> : <RiInformationLine />}
                                        <strong>{entry.aiNote.includes('Progression') ? t('progression_log') : t('ai_diagnosis')}:</strong>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>{entry.aiNote}</p>
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
