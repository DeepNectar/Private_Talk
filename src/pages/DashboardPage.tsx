import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, Phone, Video, Download, Share2, Copy, Link2, CheckCircle, AlertCircle, Loader2, Shield, Users, MessageCircle, BookHeart, Mail, Sparkles, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateAndSaveCoupleCode, connectWithCode, initiateCall, subscribeToIncomingCalls, endCall, logoutUser, subscribeToMessages, subscribeToMemories } from '../lib/firebase';
import { canInstall, isStandalone, promptInstall, subscribeToInstallState } from '../lib/pwa';
import ChatWindow from '../components/ChatWindow';
import CallModal from '../components/CallModal';
import Memories from '../components/Memories';
import LoveNotes from '../components/LoveNotes';
import DateIdeas from '../components/DateIdeas';
import LiveCounter, { useElapsed, parseDateMs } from '../components/LiveCounter';

type Tab = 'chat' | 'mem' | 'notes' | 'dates';

export default function DashboardPage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'gen' | 'conn' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [call, setCall] = useState<{ type: 'video' | 'voice'; callerId: string } | null>(null);
  const [incoming, setIncoming] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const [msgCount, setMsgCount] = useState(0);
  const [firstDate, setFirstDate] = useState<Date | null>(null);
  const [installable, setInstallable] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const ua = navigator.userAgent;
    setIosHint(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document));
    setInstallable(canInstall());
    return subscribeToInstallState(() => setInstallable(canInstall()));
  }, []);

  const installApp = async () => {
    const r = await promptInstall();
    if (r === 'unavailable') setIosHint(true); // iOS / unsupported: show manual instructions
  };

  useEffect(() => { if (!loading && !user) navigate('/'); }, [user, loading, navigate]);
  useEffect(() => { if (userData) { setCode(userData.coupleCode || ''); setPartnerId(userData.partnerId || null); setConnected(!!userData.partnerId); } }, [userData]);

  useEffect(() => {
    if (!user || !connected) return;
    return subscribeToIncomingCalls(user.uid, (d) => { if (d) setIncoming(d); });
  }, [user, connected]);

  useEffect(() => {
    if (!user || !partnerId) return;
    return subscribeToMessages(user.uid, partnerId, (m) => {
      setMsgCount(m.length);
      if (m.length > 0) { const d = m[0].createdAt?.toDate?.() || new Date(m[0].createdAt); setFirstDate(d); }
    });
  }, [user, partnerId]);

  const genCode = async () => {
    if (!user) return;
    setStatus('gen');
    try { const c = await generateAndSaveCoupleCode(user.uid); setCode(c); setStatus('ok'); setMsg('Code generated!'); await refreshUserData(); }
    catch (e: any) { setStatus('err'); setMsg(e.message); }
  };

  const connect = async () => {
    if (!user || !input.trim()) return;
    setStatus('conn');
    try {
      const r = await connectWithCode(user.uid, input.trim());
      if (r.success) { setStatus('ok'); setMsg('Connected! 💕'); setConnected(true); await refreshUserData(); }
      else { setStatus('err'); setMsg(r.error || 'Failed'); }
    } catch (e: any) { setStatus('err'); setMsg(e.message); }
  };

  const callPartner = async (type: 'video' | 'voice') => {
    if (!user || !partnerId) return;
    try { await initiateCall(user.uid, partnerId, type); setCall({ type, callerId: user.uid }); }
    catch (e: any) { alert(e.message); }
  };

  const endCallHandler = async () => {
    if (!user || !partnerId) return;
    await endCall(user.uid, partnerId);
    setCall(null); setIncoming(null);
  };

  const days = firstDate ? Math.max(1, Math.floor((Date.now() - firstDate.getTime()) / 86400000)) : 0;

  // Live counter start: earliest memory date if any, otherwise the first message.
  const [earliestMemMs, setEarliestMemMs] = useState<number | null>(null);
  useEffect(() => {
    if (!user || !partnerId) return;
    try {
      return subscribeToMemories(user.uid, partnerId, (mems) => {
        const ms = mems.map((m) => parseDateMs(m.date)).filter((t): t is number => t !== null);
        setEarliestMemMs(ms.length ? Math.min(...ms) : null);
      });
    } catch {
      return undefined;
    }
  }, [user, partnerId]);

  const counterStart = earliestMemMs ?? firstDate?.getTime() ?? null;
  const liveElapsed = useElapsed(counterStart);

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-pink-500 animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-pink-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center"><Heart className="w-5 h-5 text-white fill-white" /></div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm">LoveLink</h1>
              <p className="text-xs text-gray-500">{connected ? <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Connected</span> : 'Not connected'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isStandalone() && (installable || iosHint) && (
              <button onClick={installApp} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-xs font-medium shadow-sm">
                <Download className="w-3.5 h-3.5" />Install App
              </button>
            )}
            <button onClick={async () => { await logoutUser(); navigate('/'); }} className="p-2 text-gray-400 hover:text-rose-500 rounded-xl"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {!isStandalone() && iosHint && !installable && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-3">
          <div className="bg-white/80 border border-pink-100 rounded-2xl px-4 py-2.5 text-xs text-gray-600 flex items-start justify-between gap-3">
            <p><span className="font-semibold text-rose-500">Install on your iPhone:</span> tap the <Share2 className="w-3.5 h-3.5 inline" /> Share button in Safari, then choose <span className="font-semibold">“Add to Home Screen”</span>.</p>
            <button onClick={() => setIosHint(false)} className="text-gray-400 shrink-0">×</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col min-h-0">
        {!connected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md space-y-4">
              <div className="bg-white/80 rounded-2xl border border-pink-100 p-5 text-center">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-rose-500" /></div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Connect with Partner</h2>
                <p className="text-sm text-gray-500">Generate or enter a couple code</p>
              </div>

              <div className="bg-white/80 rounded-2xl border border-pink-100 p-5">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-pink-500" />Your Code</h3>
                {code ? (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-rose-50 border border-pink-200 rounded-xl px-3 py-2.5 font-mono text-rose-600 font-bold tracking-wider text-center">{code}</div>
                    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 bg-pink-500 text-white rounded-xl">{copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                  </div>
                ) : (
                  <button onClick={genCode} disabled={status === 'gen'} className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {status === 'gen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Link2 className="w-4 h-4" />Generate Code</>}
                  </button>
                )}
              </div>

              <div className="bg-white/80 rounded-2xl border border-pink-100 p-5">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Partner's Code</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="LOVE-XXXX" value={input} onChange={e => setInput(e.target.value.toUpperCase())} maxLength={9} className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-center uppercase focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <button onClick={connect} disabled={status === 'conn' || !input.trim()} className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm disabled:opacity-50">
                    {status === 'conn' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </button>
                </div>
              </div>

              {(status === 'ok' || status === 'err') && msg && (
                <div className={`rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${status === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {status === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Stats */}
            <div className="bg-white/80 rounded-2xl border border-pink-100 p-2.5 mb-3">
              <div className="flex items-center justify-around text-center">
                <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-rose-500" /><div><p className="text-[10px] text-gray-500">Messages</p><p className="font-bold text-gray-800 text-xs">{msgCount}</p></div></div>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-pink-500" /><div><p className="text-[10px] text-gray-500">Together</p>{liveElapsed ? (
                  <p className="font-mono tabular-nums font-bold text-rose-600 text-xs whitespace-nowrap">
                    {liveElapsed.days}d {String(liveElapsed.hours).padStart(2, '0')}:{String(liveElapsed.minutes).padStart(2, '0')}:{String(liveElapsed.seconds).padStart(2, '0')}
                  </p>
                ) : (<p className="font-bold text-gray-800 text-xs">{days}</p>)}</div></div>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /><div><p className="text-[10px] text-gray-500">Status</p><p className="font-bold text-green-600 text-xs">In Love</p></div></div>
              </div>
            </div>

            {/* Calls */}
            <div className="flex justify-center gap-2 mb-3">
              <button onClick={() => callPartner('voice')} className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 text-white rounded-full text-xs"><Phone className="w-3.5 h-3.5" />Voice</button>
              <button onClick={() => callPartner('video')} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs"><Video className="w-3.5 h-3.5" />Video</button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/80 rounded-2xl border border-pink-100 p-1 mb-3">
              {([['chat', MessageCircle, 'Chat'], ['mem', BookHeart, 'Memories'], ['notes', Mail, 'Notes'], ['dates', Sparkles, 'Dates']] as const).map(([id, Icon, label]) => (
                <button key={id} onClick={() => setTab(id as Tab)} className={`flex-1 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 ${tab === id ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'text-gray-500'}`}>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              {tab === 'chat' && <ChatWindow userId={user.uid} partnerId={partnerId!} />}
              {tab === 'mem' && <Memories userId={user.uid} partnerId={partnerId!} />}
              {tab === 'notes' && <LoveNotes userId={user.uid} partnerId={partnerId!} />}
              {tab === 'dates' && <DateIdeas />}
            </div>
          </div>
        )}
      </main>

      {/* Incoming call */}
      {incoming && !call && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${incoming.type === 'video' ? 'bg-blue-100' : 'bg-green-100'}`}>
              {incoming.type === 'video' ? <Video className="w-8 h-8 text-blue-500" /> : <Phone className="w-8 h-8 text-green-500" />}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Incoming {incoming.type === 'video' ? 'Video' : 'Voice'} Call</h3>
            <p className="text-gray-500 text-sm mb-4">Your partner is calling...</p>
            <div className="flex gap-2">
              <button onClick={async () => { await endCall(incoming.callerId, user.uid); setIncoming(null); }} className="flex-1 py-2.5 bg-red-100 text-red-600 font-medium rounded-xl">Decline</button>
              <button onClick={() => setCall({ type: incoming.type, callerId: incoming.callerId })} className="flex-1 py-2.5 bg-green-500 text-white font-medium rounded-xl">Accept</button>
            </div>
          </div>
        </div>
      )}

      {call && <CallModal callType={call.type} currentUserId={user.uid} partnerId={partnerId!} isCaller={call.callerId === user.uid} onEndCall={endCallHandler} />}
    </div>
  );
}
