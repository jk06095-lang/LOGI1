
import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { dataService } from '../services/dataService';
import { Anchor, KeyRound, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LoginProps {
  // Guest login prop removed
}

export const Login: React.FC<LoginProps> = () => {
  const [step, setStep] = useState<'code' | 'login'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Verify Code against Firestore
  const handleVerifyCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessCode.trim()) return;

      setIsLoading(true);
      setError('');

      try {
          // Check if the document exists in 'secret_codes' collection
          const isValid = await dataService.verifyAccessCode(accessCode.trim());

          if (isValid) {
              // Valid code: Store for post-login processing and move to next step
              sessionStorage.setItem('temp_access_code', accessCode.trim());
              setStep('login');
          } else {
              // Invalid code
              setError('올바르지 않은 코드입니다. (Invalid Code)');
              // Alert as requested (optional, but UI error text is also provided)
              alert("올바르지 않은 코드입니다.");
          }
      } catch (err) {
          console.error("Verification Error:", err);
          setError('코드 확인 중 오류가 발생했습니다.');
      } finally {
          setIsLoading(false);
      }
  };

  // Step 2: Google Sign-In
  const handleLogin = () => {
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const user = result.user;
        console.log("Login successful:", user.email);
        // App.tsx auth listener will handle the rest
      }).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Login Error:", errorCode, errorMessage);
        
        if (errorCode === 'auth/unauthorized-domain') {
           alert(`Domain not authorized for Firebase Auth. Please check Firebase Console.`);
        } else {
           alert(`Login failed: ${errorMessage}`);
        }
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100 animate-fade-in relative overflow-hidden">
        {/* Background blobs for aesthetics */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-600/40 ring-4 ring-blue-50">
              <Anchor size={40} strokeWidth={2.5} />
            </div>
            
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight flex items-center justify-center gap-1">
              LOGI<span className="text-blue-600">1</span>
            </h1>
            <p className="text-slate-500 mb-10 font-medium tracking-wide text-sm">Logistics Management System</p>
            
            {step === 'code' ? (
                <form onSubmit={handleVerifyCode} className="animate-fade-in">
                    <div className="mb-4 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">입장 코드 (Access Code)</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="password" 
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value);
                                    if(error) setError('');
                                }}
                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold text-slate-800 placeholder-slate-300 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`}
                                placeholder="코드를 입력하세요"
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1 animate-fade-in">
                                <AlertCircle size={12} /> {error}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!accessCode.trim() || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>확인 (Verify) <ArrowRight size={18} /></>}
                    </button>
                </form>
            ) : (
                <div className="animate-fade-in-up">
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl mb-6 flex items-center justify-center gap-2 text-sm font-bold border border-emerald-100">
                        <CheckCircle size={16} />
                        코드 인증 완료
                    </div>
                    <button
                        onClick={handleLogin}
                        className="w-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md group mb-4 active:scale-95"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                        Google 계정으로 로그인
                    </button>
                    <button 
                        onClick={() => {
                            setStep('code');
                            setAccessCode('');
                            setError('');
                        }} 
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                        코드를 다시 입력하시겠습니까?
                    </button>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                Protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                <br/>
                <span className="font-bold text-slate-300 mt-2 block">LOGI1 &copy; {new Date().getFullYear()}</span>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
