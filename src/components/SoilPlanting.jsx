import React from 'react';
import { RiPlantLine, RiTimeLine } from 'react-icons/ri';

const SoilPlanting = () => {
    return (
        <div className="soil-planting-view animate-fade" style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--spacing-xl)', maxWidth: '500px' }}>
                <div style={{ fontSize: '4rem', color: 'var(--primary)', marginBottom: 'var(--spacing-lg)', opacity: 0.8 }}>
                    <RiPlantLine />
                </div>
                <h2 className="orbitron" style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '10px' }}>SOIL PLANTING</h2>
                <div className="text-dim" style={{ letterSpacing: '4px', fontSize: '0.7rem', fontWeight: 900, marginBottom: '2rem' }}>AGROCORE MODULE #03</div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '15px', background: 'rgba(153, 173, 122, 0.1)', borderRadius: '12px', border: '1px dashed var(--secondary)' }}>
                    <RiTimeLine className="glow-text-primary" />
                    <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>COMING SOON: NEURAL SOIL ANALYSIS</span>
                </div>

                <p className="text-dim" style={{ marginTop: '2rem', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    We are currently calibrating the Earthy Neural sensors for soil-based substrates. This module will feature localized planting calendars for Algerian soil types and AI-driven irrigation forecasting.
                </p>
            </div>
        </div>
    );
};

export default SoilPlanting;
