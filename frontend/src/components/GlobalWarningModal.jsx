import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const GlobalWarningModal = () => {
    const { notifications, user } = useAuth();
    
    // Find the most recent unread admin warning
    const warning = (notifications || []).find(n => n.type === 'admin_warning' && !n.read);

    const handleDismiss = async () => {
        if (!user || !warning) return;
        try {
            await updateDoc(doc(db, 'notifications', warning.id), { read: true });
        } catch (err) {
            console.error('Failed to dismiss warning:', err);
        }
    };

    return (
        <AnimatePresence>
            {warning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="max-w-md w-full bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                        {/* Background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[80px] -z-10" />
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                                Administrative Warning
                            </h2>
                            
                            <div className="w-12 h-1 bg-red-500 mx-auto rounded-full mb-6" />
                            
                            <p className="text-slate-300 text-lg leading-relaxed mb-8 font-medium">
                                "{warning.message}"
                            </p>
                            
                            <button
                                onClick={handleDismiss}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                            >
                                I Understand
                            </button>
                            
                            <p className="mt-4 text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                                Official Intelligence Division
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GlobalWarningModal;
