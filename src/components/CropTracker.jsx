import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { useI18n } from '../context/i18nContext';
import { RiHandCoinLine, RiDropLine, RiLineChartLine, RiFlaskLine } from 'react-icons/ri';

const CropTracker = () => {
    const { crops } = usePlatform();
    const { t } = useI18n();

    const getStatusColor = (status) => {
        switch (status) {
            case 'optimal': return 'var(--primary)';
            case 'warning': return '#ffc107';
            case 'critical': return 'var(--secondary)';
            default: return 'var(--text-dim)';
        }
    };

    return (
        <div className="tracker-view">
            <header style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="glow-text-primary">{t('tracker').toUpperCase()}</h2>
                    <p className="text-dim">Nutrient memory and maturity countdowns enabled.</p>
                </div>
                <button className="btn-primary">+ {t('log_new_crop')}</button>
            </header>

            <div className="crop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
                {crops.map(crop => (
                    <div key={crop.id} className="glass-panel crop-card" style={{ padding: 'var(--spacing-md)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${getStatusColor(crop.status)}`, fontSize: '0.6rem', color: getStatusColor(crop.status) }}>
                            {crop.status.toUpperCase()}
                        </div>

                        <h3 className="orbitron">{crop.common.toUpperCase()}</h3>
                        <p className="text-dim" style={{ fontSize: '0.8rem', fontStyle: 'italic', marginBottom: 'var(--spacing-md)' }}>{crop.species}</p>

                        <div className="crop-biometrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <div className="biometric-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                    <RiLineChartLine /> {t('harvest')}
                                </div>
                                <div style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{crop.harvestCountdown} {t('days')}</div>
                            </div>
                            <div className="biometric-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                    <RiDropLine /> {t('hydration')}
                                </div>
                                <div style={{ fontSize: '1.1rem' }}>{crop.lastWatered}</div>
                            </div>
                        </div>

                        <div className="fertilizer-history" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--spacing-sm)', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                <RiFlaskLine /> {t('last_fertilizer')}:
                            </div>
                            {crop.fertilizerHistory.length > 0 ? (
                                <div className="text-bright">
                                    {crop.fertilizerHistory[0].type} ({crop.fertilizerHistory[0].date})
                                </div>
                            ) : (
                                <div className="text-dim">No history logged</div>
                            )}
                        </div>

                        <button className="btn-primary" style={{ marginTop: 'var(--spacing-md)', width: '100%', justifyContent: 'center', fontSize: '0.7rem' }}>
                            <RiHandCoinLine /> {t('log_treatment')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CropTracker;
