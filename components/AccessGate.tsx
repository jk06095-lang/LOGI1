import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, LogOut } from 'lucide-react';

interface AccessGateProps {
  onVerify: (code: string) => Promise<boolean>;
  onLogout: () => void;
  userEmail?: string;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onVerify, onLogout, userEmail }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const isValid = await onVerify(code.trim());
      if (!isValid) {
        setError('유효하지 않은 입장 코드입니다. (Invalid Access Code)');
      }
    } catch (err) {
      setError('인증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100 animate-fade-in relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
              <Lock size={32} strokeWidth={2.5} />
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 mb-2">보안 인증 (Access Verification)</h1>
            <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">
              LOGI1 시스템에 접속하려면 입장 코드가 필요합니다.<br/>
              <span className="text-xs text-slate-400 mt-1 block">Logged in as: {userEmail}</span>
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    type="password" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="입장 코드 입력 (Access Code)"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    autoFocus
                />
                
                {error && <p className="text-xs text-red-500 font-bold animate-pulse">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <>인증하기 <ArrowRight size={20} /></>}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <button onClick={onLogout} className="text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto transition-colors">
                    <LogOut size={12} /> 다른 계정으로 로그인
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
