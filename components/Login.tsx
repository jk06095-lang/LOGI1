
import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Anchor } from 'lucide-react';

interface LoginProps {
  // Guest login prop removed
}

export const Login: React.FC<LoginProps> = () => {
  const handleLogin = () => {
    // Using the specific Google Auth flow
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        // The signed-in user info.
        const user = result.user;
        console.log("Login successful:", user.email);
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
            
            <button
              onClick={handleLogin}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md group mb-4"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              Sign in with Google
            </button>

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
