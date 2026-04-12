import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../context/i18nContext';
import { usePlatform } from '../context/PlatformContext';
import { RiSendPlane2Line, RiRobotLine, RiUserLine } from 'react-icons/ri';

const ChatAssistant = () => {
    const { t, locale, isRTL } = useI18n();
    const { crops, weather } = usePlatform();
    const [messages, setMessages] = useState([
        {
            id: 1, type: 'ai', content: locale === 'ar' ? 'تم استقرار الشبكة الوعائية. أنا AGROCORE. كيف يمكنني مساعدتك اليوم؟' :
                locale === 'fr' ? 'Réseau vasculaire stabilisé. Je suis AGROCORE. Comment puis-je vous aider aujourd\'hui?' :
                    'Vascular network stabilized. I am AGROCORE. How can I assist your field operations today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), type: 'operator', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulated Neural Reasoning with Linguistic Mirroring
        setTimeout(() => {
            let response = "";

            // Linguistic Mirroring Logic
            if (locale === 'ar') {
                response = `تحليل: "${userMsg.content}". بناءً على إحداثياتك الإقليمية وتاريخ العناصر الغذائية، أشتبه في حدوث تباطؤ في التمثيل الغذائي المحلي. توصية استباقية: تحقق من مستويات التوصيل الكهربائي للتربة على عمق 15 سم.`;
            } else if (locale === 'fr') {
                response = `ANALYSE: "${userMsg.content}". Sur la base de vos coordonnées régionales et de l'historique N-P-K, je soupçonne un décalage métabolique localisé. Recommandation proactive: Vérifiez les niveaux d'EC du sol à 15 cm de profondeur.`;
            } else {
                response = `ANALYZING: "${userMsg.content}". Based on your regional coordinates and recent N-P-K history, I suspect a localized metabolic lag. Proactive recommendation: Verify soil EC levels at 15cm depth.`;
            }

            const aiMsg = { id: Date.now() + 1, type: 'ai', content: response };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="glass-panel chat-container" style={{ height: 'calc(100vh - 200px)', padding: 'var(--spacing-md)' }}>
            <header style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RiRobotLine className="glow-text-primary" />
                <h3 className="orbitron" style={{ fontSize: '0.9rem' }}>NEURAL REASONING CORE</h3>
            </header>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column' }}>
                {messages.map(msg => (
                    <div key={msg.id} className={`chat-bubble ${msg.type}`}>
                        <div style={{ fontSize: '0.6rem', marginBottom: '4px', opacity: 0.7, textTransform: 'uppercase' }}>
                            {msg.type === 'ai' ? 'AGROCORE' : 'OPERATOR'}
                        </div>
                        <div style={{ fontSize: '0.9rem' }}>{msg.content}</div>
                    </div>
                ))}
                {isTyping && <div className="text-dim" style={{ fontSize: '0.7rem' }}>AGROCORE is synthesizing logic...</div>}
            </div>

            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('chat_placeholder') || 'Inquire about field health...'}
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '10px 15px',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        textAlign: isRTL ? 'right' : 'left'
                    }}
                />
                <button className="btn-primary" onClick={handleSend}>
                    <RiSendPlane2Line />
                </button>
            </div>
        </div>
    );
};

export default ChatAssistant;
