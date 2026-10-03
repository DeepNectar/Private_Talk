import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, Lock, Mail, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { registerUser, loginUser } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) await loginUser(email, password);
      else {
        if (!displayName.trim()) { setError('Please enter your name'); setLoading(false); return; }
        await registerUser(email, password, displayName.trim());
      }
      navigate('/dashboard');
    } catch (err: any) {
      const c = err.code || '';
      if (c.includes('user-not-found') || c.includes('wrong-password') || c.includes('invalid-credential')) setError('Invalid email or password.');
      else if (c.includes('email-already-in-use')) setError('Email already registered.');
      else if (c.includes('weak-password')) setError('Password must be 6+ characters.');
      else if (c.includes('configuration-not-found')) setError('⚠️ Firebase Auth not enabled. Go to Firebase Console → Authentication → Get started → Enable Email/Password.');
      else setError(err.message || 'An error occurred.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl shadow-lg shadow-pink-200 mb-3">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">LoveLink</h1>
          <p className="text-gray-500 mt-1 text-sm flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5 text-pink-400" />Private communication for couples</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-pink-100/50 border border-white/50 p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>Register</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="password" placeholder="Password (6+ chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-gray-200"></div><span className="text-xs text-gray-400">OR</span><div className="flex-1 h-px bg-gray-200"></div></div>

          <button onClick={() => navigate('/demo')} className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl shadow-lg flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />Try Demo Mode
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Test all features without login</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">🔒 End-to-end private. Only you and your partner.</p>
      </div>
    </div>
  );
}
