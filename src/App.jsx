import React, { useState } from 'react';
import './App.css';
import {
  RiDashboardLine,
  RiMapPinLine,
  RiPlantLine,
  RiBookReadLine,
  RiCloudLine,
  RiNotificationLine,
  RiContrastLine,
  RiMessage3Line,
  RiDropLine
} from 'react-icons/ri';

import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { I18nProvider, useI18n } from './context/i18nContext';
import FieldMap from './components/FieldMap';
import SoilPlanting from './components/SoilPlanting';
import GrowthJournal from './components/GrowthJournal';
import ChatAssistant from './components/ChatAssistant';
import Climate from './components/Climate';
import Hydroponics from './components/Hydroponics';

const AppContent = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [nightMode, setNightMode] = useState(false);
  const { weather, alerts, isMissionActive } = usePlatform();
  const { t, locale, setLocale, isRTL } = useI18n();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: <RiDashboardLine /> },
    { id: 'map', label: t('map'), icon: <RiMapPinLine /> },
    { id: 'soil', label: 'Soil Planting', icon: <RiPlantLine /> },
    { id: 'journal', label: t('journal'), icon: <RiBookReadLine /> },
    { id: 'chat', label: t('chat_agent'), icon: <RiMessage3Line /> },
    { id: 'climate', label: t('climate'), icon: <RiCloudLine /> },
    {
      id: 'hydro',
      label: 'Hydroponics',
      icon: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RiDropLine />
          {isMissionActive && <span style={{ color: '#ef4444', animation: 'pulse 1.5s infinite', fontSize: '1.2rem' }}>●</span>}
        </div>
      )
    },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'map': return <FieldMap />;
      case 'soil': return <SoilPlanting />;
      case 'journal': return <GrowthJournal />;
      case 'chat': return <ChatAssistant />;
      case 'climate': return <Climate />;
      case 'hydro': return <Hydroponics />;
      case 'dashboard':
        return (
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)' }}>
            <div className="glass-panel stat-card">
              <h4 className="text-dim">{t('air_temp')}</h4>
              <h2 className="glow-text-primary" style={{ fontSize: '2.5rem' }}>{weather.temp}°C</h2>
            </div>
            <div className="glass-panel stat-card">
              <h4 className="text-dim">{t('humidity')}</h4>
              <h2 className="glow-text-primary" style={{ fontSize: '2.5rem' }}>{weather.humidity}%</h2>
            </div>
            <div className="glass-panel stat-card">
              <h4 className="text-dim">RESOURCE RISK</h4>
              <h2 className={weather.risk === 'Optimal' ? 'glow-text-primary' : 'glow-text-secondary'} style={{ fontSize: '2.5rem' }}>{weather.risk.toUpperCase()}</h2>
            </div>

            {/* NEW: Irrigation Intelligence Node */}
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 'var(--spacing-lg)', background: 'linear-gradient(90deg, rgba(153, 173, 122, 0.15) 0%, transparent 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: 'var(--spacing-md)' }}>
                <RiDropLine className="glow-text-primary" style={{ fontSize: '1.5rem' }} />
                <h3 className="orbitron" style={{ fontSize: '1rem', color: 'var(--primary)' }}>IRRIGATION SIMULATOR (PREDICTIVE)</h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                  <div className="text-dim" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Projected Soil Moisture Depletion (24h)</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)' }}>- 12.4%</div>
                </div>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <div className="text-dim" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Next Optimal Window</div>
                  <div className="glow-text-primary" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Tomorrow 05:30 AM</div>
                </div>
              </div>
              <div style={{ background: 'rgba(84, 107, 65, 0.08)', height: '10px', borderRadius: '5px', marginTop: '24px', overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg, var(--secondary), var(--primary))',
                  width: '65%',
                  height: '100%',
                  boxShadow: '0 4px 15px rgba(153, 173, 122, 0.3)'
                }}></div>
              </div>
            </div>

            <div className="glass-panel alerts-container" style={{ gridColumn: '1 / -1', padding: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                <h3 className="orbitron" style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{t('active_alerts')}</h3>
                <span className="text-dim" style={{ fontSize: '0.7rem' }}>REGION: NORTH AFRICA (DETECTED)</span>
              </div>

              {alerts.map(alert => (
                <div key={alert.id} className="alert-item follow-up-alert" style={{
                  marginBottom: '15px',
                  display: 'flex',
                  gap: '15px',
                  padding: '15px',
                  background: 'rgba(153, 173, 122, 0.08)',
                  borderRadius: '12px'
                }}>
                  <RiNotificationLine style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--primary)' }}>{alert.message}</strong>
                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>Received: {alert.date} • Recommended: Visual node check</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default: return <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Module Calibrating...</div>;
    }
  };

  return (
    <div className={`app-container ${nightMode ? 'night-shift' : ''} ${isRTL ? 'rtl-layout' : ''}`}>
      <nav className="sidebar glass-panel">
        <div className="logo-container">
          <div className="logo-icon glow-text-primary">A</div>
          <h2 className="nav-text glow-text-primary">AGROCORE</h2>
        </div>

        <ul className="nav-links">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                onClick={() => setActiveModule(item.id)}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: isRTL ? 'right' : 'left', font: 'inherit', cursor: 'pointer' }}
              >
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="locale-switcher" style={{ marginTop: 'auto', padding: 'var(--spacing-md)', display: 'flex', gap: '10px' }}>
          <button onClick={() => setLocale('en')} className={locale === 'en' ? 'active' : ''}>EN</button>
          <button onClick={() => setLocale('fr')} className={locale === 'fr' ? 'active' : ''}>FR</button>
          <button onClick={() => setLocale('ar')} className={locale === 'ar' ? 'active' : ''}>AR</button>
        </div>
      </nav>

      <header className="navbar glass-panel">
        <div className="nav-breadcrumb">
          <span className="text-dim">SYSTEM /</span> {activeModule.toUpperCase()}
          {isOffline && <span className="offline-badge" style={{ marginLeft: 'var(--spacing-md)' }}>OFFLINE MODE</span>}
        </div>

        <div className="nav-actions" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button className="btn-primary" onClick={() => setNightMode(!nightMode)}>
            <RiContrastLine /> <span>{t('night_mode')}</span>
          </button>
          <button className="btn-primary">
            <RiNotificationLine /> <span>{alerts.length} {t('alerts')}</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="dashboard-hero" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 className="glow-text-primary">{t('system_status')}: {isOffline ? 'OFFLINE' : t('optimal')}</h1>
          <p className="text-dim">{t('pulse')}: {new Date().toLocaleTimeString()}</p>
        </section>

        {renderModule()}
      </main>
    </div>
  );
};

const App = () => (
  <PlatformProvider>
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  </PlatformProvider>
);

export default App;
