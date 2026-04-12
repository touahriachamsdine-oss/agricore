import React, { createContext, useContext, useState, useEffect } from 'react';

const I18nContext = createContext();

const translations = {
    en: {
        dashboard: 'Dashboard',
        map: 'Field Map',
        tracker: 'Crop Tracker',
        journal: 'Growth Journal',
        climate: 'Climate',
        night_mode: 'NIGHT MODE',
        alerts: 'ALERTS',
        system_status: 'SYSTEM STATUS',
        optimal: 'OPTIMAL',
        pulse: 'Pulse',
        air_temp: 'AIR TEMP',
        humidity: 'HUMIDITY',
        current_risk: 'CURRENT RISK',
        active_alerts: 'ACTIVE SMART ALERTS',
        pest_calendar: 'PROACTIVE REGIONAL CALENDAR',
        high_risk: 'HIGH RISK DETECTED',
        harvest: 'Harvest',
        hydration: 'Hydration',
        last_fertilizer: 'Last Fertilizer',
        log_treatment: 'LOG TREATMENT',
        log_new_crop: 'LOG NEW CROP',
        progression_log: 'PROGRESSION LOG',
        ai_diagnosis: 'AI DIAGNOSIS',
        follow_up: 'FOLLOW-UP',
        days: 'Days',
        ago: 'ago',
        chat_agent: 'Neural Chat'
    },
    fr: {
        dashboard: 'Tableau de bord',
        map: 'Carte du champ',
        tracker: 'Suivi des cultures',
        journal: 'Journal de croissance',
        climate: 'Climat',
        night_mode: 'MODE NUIT',
        alerts: 'ALERTES',
        system_status: 'STATUT DU SYSTÈME',
        optimal: 'OPTIMAL',
        pulse: 'Pouls',
        air_temp: 'TEMP AIR',
        humidity: 'HUMIDITÉ',
        current_risk: 'RISQUE ACTUEL',
        active_alerts: 'ALERTES INTELLIGENTES',
        pest_calendar: 'CALENDRIER RÉGIONAL PROACTIF',
        high_risk: 'RISQUE ÉLEVÉ DÉTECTÉ',
        harvest: 'Récolte',
        hydration: 'Hydratation',
        last_fertilizer: 'Dernier Engrais',
        log_treatment: 'NOTER TRAITEMENT',
        log_new_crop: 'NOTER CULTURE',
        progression_log: 'LOG DE PROGRESSION',
        ai_diagnosis: 'DIAGNOSTIC IA',
        follow_up: 'SUIVI',
        days: 'Jours',
        ago: 'il y a',
        chat_agent: 'Chat Neuronal'
    },
    ar: {
        dashboard: 'لوحة التحكم',
        map: 'خريطة الحقل',
        tracker: 'متبع المحاصيل',
        journal: 'سجل النمو',
        climate: 'المناخ',
        night_mode: 'الوضع الليلي',
        alerts: 'التنبيهات',
        system_status: 'حالة النظام',
        optimal: 'مثالي',
        pulse: 'النبض',
        air_temp: 'حرارة الجو',
        humidity: 'الرطوبة',
        current_risk: 'المخاطر الحالية',
        active_alerts: 'تنبيهات ذكية نشطة',
        pest_calendar: 'التقويم الإقليمي الاستباقي',
        high_risk: 'تم اكتشاف مخاطر عالية',
        harvest: 'الحصاد',
        hydration: 'الترطيب',
        last_fertilizer: 'آخر تسميد',
        log_treatment: 'تسجيل العلاج',
        log_new_crop: 'تسجيل محصول جديد',
        progression_log: 'سجل التطور',
        ai_diagnosis: 'تشخيص الذكاء الاصطناعي',
        follow_up: 'متابعة',
        days: 'أيام',
        ago: 'منذ',
        chat_agent: 'الدردشة العصبية'
    }
};

export const I18nProvider = ({ children }) => {
    const [locale, setLocale] = useState('en');
    const [isRTL, setIsRTL] = useState(false);

    useEffect(() => {
        setIsRTL(locale === 'ar');
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
    }, [locale]);

    const t = (key) => translations[locale][key] || key;

    return (
        <I18nContext.Provider value={{ locale, setLocale, isRTL, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => useContext(I18nContext);
