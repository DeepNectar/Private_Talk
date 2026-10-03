import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, Phone, Video, Copy, CheckCircle, AlertCircle, Loader2, Users, Send, Zap, ArrowLeft, MessageCircle, Download, Search, X, MoreHorizontal, Reply, BookHeart, Mail, Sparkles, Calendar, MailOpen, RefreshCw, Shield, Image as ImageIcon } from 'lucide-react';
import LiveCounter, { useElapsed } from '../components/LiveCounter';

function demoToMs(date: string): number | null {
  if (!date) return null;
  const t = new Date(date.length === 10 ? `${date}T00:00:00` : date).getTime();
  return Number.isNaN(t) ? null : t;
}

function DemoLiveCounter({ dates }: { dates: string[] }) {
  const since = useMemo(() => {
    const ms = dates.map(demoToMs).filter((v): v is number => !!v);
    return ms.length ? Math.min(...ms) : null;
  }, [dates]);
  return <LiveCounter since={since} label="Together for" />;
}

function DemoElapsed({ date }: { date: string }) {
  const e = useElapsed(demoToMs(date));
  if (!e) return null;
  return (
    <p className="text-[11px] font-mono tabular-nums text-rose-500 flex items-center gap-1 mt-1">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
      {e.days > 0 ? `${e.days}d ` : ''}
      {String(e.hours).padStart(2, '0')}:{String(e.minutes).padStart(2, '0')}:{String(e.seconds).padStart(2, '0')} ago
    </p>
  );
}

/** Live "Xd HH:MM:SS" clock for the demo stats bar (counts from the first memory / demo start). */
function DemoLiveClock() {
  const e = useElapsed(demoToMs('2024-02-14'));
  if (!e) return <p className="font-bold text-gray-800 text-sm">—</p>;
  return (
    <p className="font-mono tabular-nums font-bold text-rose-600 text-sm whitespace-nowrap">
      {e.days}d {String(e.hours).padStart(2, '0')}:{String(e.minutes).padStart(2, '0')}:{String(e.seconds).padStart(2, '0')}
    </p>
  );
}

interface Msg { id: string; text: string; sender: string; time: Date; own: boolean; }

const REPLIES = ["Hey! 💕", "Miss you! ❤️", "So sweet! 😊", "Love you! 💖", "Haha 😄", "Aww 🥺", "Can't wait!", "Same here 💫", "You're the best 🥰", "Tell me more!"];
const QUICK = ['❤️ Love you!', 'Miss you 💕', 'How are you?', 'Call me?', 'Thinking of you 🥰'];
const DATES = [
  { t: 'Cook Together', d: 'Pick a new recipe and cook it together!', i: '🍳', c: 'Food', b: '$$' },
  { t: 'Stargazing', d: 'Find a dark spot and watch the stars.', i: '⭐', c: 'Nature', b: 'Free' },
  { t: 'Movie Night', d: 'Pick a theme and watch movies with popcorn!', i: '🎬', c: 'Fun', b: '$' },
  { t: 'Picnic', d: 'Pack food and enjoy nature together.', i: '🌳', c: 'Nature', b: '$' },
  { t: 'Dance Party', d: 'Make a playlist and dance together!', i: '💃', c: 'Fun', b: 'Free' },
  { t: 'Game Night', d: 'Board games or video games!', i: '🎮', c: 'Fun', b: 'Free' },
  { t: 'Paint Date', d: 'Paint each other or follow a tutorial!', i: '🎨', c: 'Creative', b: '$$' },
  { t: 'Coffee Date', d: 'Try a new café together!', i: '☕', c: 'Food', b: '$' },
  { t: 'Love Letters', d: 'Write letters to each other!', i: '💌', c: 'Romantic', b: 'Free' },
  { t: 'Sunset Walk', d: 'Watch the sunset together.', i: '🌅', c: 'Nature', b: 'Free' },
];

export default function DemoPage() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [code] = useState(() => 'LOVE-' + Math.random().toString(36).substring(2, 6).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'chat' | 'mem' | 'notes' | 'dates'>('chat');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Memories
  const [mems, setMems] = useState([
    { id: '1', t: 'First Date', d: 'We met at that cute café!', date: '2024-02-14' },
    { id: '2', t: 'Beach Trip', d: 'Beautiful sunset together 🌅', date: '2024-06-20' },
  ]);
  const [memForm, setMemForm] = useState(false);
  const [memT, setMemT] = useState('');
  const [memD, setMemD] = useState('');

  // Notes
  const [notes, setNotes] = useState([
    { id: '1', from: 'Partner', title: 'Just Because...', content: 'Every moment with you feels like a dream. I love you more than words can say 💕', read: false, date: new Date(Date.now() - 86400000) },
  ]);
  const [noteForm, setNoteForm] = useState(false);
  const [noteT, setNoteT] = useState('');
  const [noteC, setNoteC] = useState('');
  const [selNote, setSelNote] = useState<typeof notes[0] | null>(null);

  // Dates
  const [idea, setIdea] = useState<typeof DATES[0] | null>(null);
  const [saved, setSaved] = useState<typeof DATES>([]);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const connect = () => {
    setTimeout(() => { setConnected(true); }, 1200);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const m: Msg = { id: Date.now() + '', text: input.trim(), sender: 'You', time: new Date(), own: true };
    setMsgs(p => [...p, m]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(p => [...p, { id: Date.now() + '', text: REPLIES[Math.floor(Math.random() * REPLIES.length)], sender: 'Partner', time: new Date(), own: false }]);
    }, 1200 + Math.random() * 800);
  };

  const exportChat = () => {
    if (!msgs.length) return alert('No messages!');
    let t = `💕 LoveLink Chat Export\n${'='.repeat(50)}\nExported: ${new Date().toLocaleString()}\nParticipants: You & Partner\nMessages: ${msgs.length}\n${'='.repeat(50)}\n\n`;
    let last = '';
    msgs.forEach(m => {
      const d = m.time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (d !== last) { t += `\n${'─'.repeat(50)}\n📅 ${d}\n${'─'.repeat(50)}\n\n`; last = d; }
      t += `[${m.time.toLocaleTimeString()}] ${m.sender}:\n  ${m.text}\n\n`;
    });
    t += `\n${'='.repeat(50)}\nMade with 💕 LoveLink\n`;
    const blob = new Blob([t], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lovelink-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const filtered = search ? msgs.filter(m => m.text.toLowerCase().includes(search.toLowerCase())) : msgs;

  const getDate = (d: Date) => {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const groupMsgs = () => {
    const g: { date: string; msgs: Msg[] }[] = [];
    let ld = '';
    filtered.forEach(m => {
      const d = getDate(m.time);
      if (d !== ld) { g.push({ date: d, msgs: [m] }); ld = d; }
      else g[g.length - 1].msgs.push(m);
    });
    return g;
  };

  const spinDate = () => {
    setSpinning(true);
    setTimeout(() => { setIdea(DATES[Math.floor(Math.random() * DATES.length)]); setSpinning(false); }, 600);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-rose-500"><ArrowLeft className="w-5 h-5" /> Back</button>
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 text-white flex items-center gap-2"><Zap className="w-5 h-5" /><b>Demo Mode</b> — Test all features instantly!</div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-pink-100 p-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Users className="w-7 h-7 text-rose-500" /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Connect Demo Partner</h2>
            <p className="text-sm text-gray-500 mb-4">Your code: <b className="text-rose-600 font-mono">{code}</b></p>
            <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mb-4 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm flex items-center gap-2 mx-auto">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button onClick={connect} className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl shadow-md flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Connect Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-pink-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-rose-500 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-9 h-9 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center"><Heart className="w-5 h-5 text-white fill-white" /></div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm flex items-center gap-2">LoveLink <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">DEMO</span></h1>
              <p className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Connected</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-rose-500 rounded-xl"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col min-h-0">
        {/* Stats */}
        <div className="bg-white/80 rounded-2xl border border-pink-100 p-3 mb-3">
          <div className="flex items-center justify-around text-center">
            <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-rose-500" /><div><p className="text-xs text-gray-500">Messages</p><p className="font-bold text-gray-800 text-sm">{msgs.length}</p></div></div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-pink-500" /><div><p className="text-xs text-gray-500">Together</p><DemoLiveClock /></div></div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-500 fill-red-500" /><div><p className="text-xs text-gray-500">Status</p><p className="font-bold text-green-600 text-sm">In Love</p></div></div>
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => alert('Demo: Voice call')} className="flex items-center gap-2 px-5 py-2 bg-green-500 text-white rounded-full text-sm"><Phone className="w-4 h-4" />Voice</button>
          <button onClick={() => alert('Demo: Video call')} className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-full text-sm"><Video className="w-4 h-4" />Video</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/80 rounded-2xl border border-pink-100 p-1 mb-3">
          {([['chat', MessageCircle, 'Chat'], ['mem', BookHeart, 'Memories'], ['notes', Mail, 'Notes'], ['dates', Sparkles, 'Dates']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 ${tab === id ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'text-gray-500'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {/* CHAT */}
          {tab === 'chat' && (
            <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-pink-100 bg-white/80">
                <span className="text-xs text-gray-500">{msgs.length} msgs {search && `• ${filtered.length} found`}</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 text-gray-400 hover:text-pink-500 rounded-lg"><Search className="w-4 h-4" /></button>
                  <div className="relative">
                    <button onClick={() => setMenu(!menu)} className="p-1.5 text-gray-400 hover:text-pink-500 rounded-lg"><MoreHorizontal className="w-4 h-4" /></button>
                    {menu && <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border py-1 w-44 z-10"><button onClick={() => { exportChat(); setMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-pink-50 flex items-center gap-2"><Download className="w-4 h-4" />Export Chat</button></div>}
                  </div>
                </div>
              </div>
              {showSearch && <div className="px-3 py-2 border-b border-pink-100 flex items-center gap-2"><Search className="w-4 h-4 text-gray-400" /><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent focus:outline-none" autoFocus />{search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}</div>}
              
              <div className="flex-1 overflow-y-auto p-3">
                {!msgs.length ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-3"><MessageCircle className="w-7 h-7 text-rose-400" /></div>
                    <p className="text-gray-500 text-sm">Send your first message 💕</p>
                  </div>
                ) : groupMsgs().map((g, i) => (
                  <div key={i}>
                    <div className="flex justify-center my-3"><span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{g.date}</span></div>
                    {g.msgs.map(m => (
                      <div key={m.id} className={`flex ${m.own ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${m.own ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md' : 'bg-white border border-gray-100 rounded-bl-md'}`}>
                          <p className={`text-[10px] font-semibold mb-0.5 ${m.own ? 'text-white/80' : 'text-pink-500'}`}>{m.sender}</p>
                          <p className="text-sm">{m.text}</p>
                          <p className={`text-[10px] mt-0.5 ${m.own ? 'text-white/70 text-right' : 'text-gray-400'}`}>{m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {typing && <div className="flex justify-start mb-2"><div className="bg-white border rounded-2xl px-4 py-2"><div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>}
                <div ref={endRef} />
              </div>

              {!input && msgs.length > 0 && <div className="px-3 py-1.5 flex gap-2 overflow-x-auto border-t border-pink-50">{QUICK.map(q => <button key={q} onClick={() => setInput(q)} className="flex-shrink-0 px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100">{q}</button>)}</div>}

              <form onSubmit={send} className="p-2 border-t border-pink-100 flex gap-2">
                <input type="text" placeholder="Type..." value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                <button type="submit" disabled={!input.trim()} className="p-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl disabled:opacity-50"><Send className="w-5 h-5" /></button>
              </form>
            </div>
          )}

          {/* MEMORIES */}
          {tab === 'mem' && (
            <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center gap-2"><BookHeart className="w-5 h-5 text-rose-500" /><b className="text-gray-700">Memories</b></div>
                <button onClick={() => setMemForm(!memForm)} className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-sm">{memForm ? '✕' : '+ Add'}</button>
              </div>
              {memForm && (
                <div className="p-3 border-b border-pink-100 space-y-2">
                  <input placeholder="Title" value={memT} onChange={e => setMemT(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <textarea placeholder="What happened?" value={memD} onChange={e => setMemD(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <button onClick={() => { if (memT.trim()) { setMems([{ id: Date.now() + '', t: memT, d: memD, date: new Date().toISOString().split('T')[0] }, ...mems]); setMemT(''); setMemD(''); setMemForm(false); } }} className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Save</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <DemoLiveCounter dates={mems.map(m => m.date)} />
                {!mems.length ? <div className="text-center py-12"><BookHeart className="w-12 h-12 text-rose-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No memories yet 💕</p></div> : mems.map(m => (
                  <div key={m.id} className="bg-white rounded-xl border border-pink-100 p-4">
                    <div className="flex justify-between items-start mb-1"><h3 className="font-semibold text-gray-800 flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />{m.t}</h3><button onClick={() => setMems(mems.filter(x => x.id !== m.id))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>
                    {m.d && <p className="text-sm text-gray-600 mb-2">{m.d}</p>}
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(m.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <DemoElapsed date={m.date} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOVE NOTES */}
          {tab === 'notes' && (
            <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center gap-2"><Mail className="w-5 h-5 text-rose-500" /><b className="text-gray-700">Love Notes</b></div>
                <button onClick={() => { setNoteForm(!noteForm); setSelNote(null); }} className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-sm">{noteForm ? '✕' : '+ Write'}</button>
              </div>
              {noteForm ? (
                <div className="p-3 space-y-2">
                  <div className="text-center mb-2"><Heart className="w-8 h-8 text-rose-400 fill-rose-400 mx-auto" /><p className="text-xs text-gray-500 mt-1">Write to Partner</p></div>
                  <input placeholder="Title" value={noteT} onChange={e => setNoteT(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <textarea placeholder="Pour your heart out 💕" value={noteC} onChange={e => setNoteC(e.target.value)} rows={6} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" style={{ fontFamily: 'Georgia, serif' }} />
                  <button onClick={() => { if (noteT.trim() && noteC.trim()) { setNotes([{ id: Date.now() + '', from: 'You', title: noteT, content: noteC, read: true, date: new Date() }, ...notes]); setNoteT(''); setNoteC(''); setNoteForm(false); } }} className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm">Send with Love 💕</button>
                </div>
              ) : selNote ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <button onClick={() => setSelNote(null)} className="text-sm text-rose-500 mb-3">← Back</button>
                  <div className="bg-white rounded-2xl border border-pink-100 p-6 text-center">
                    <Heart className="w-12 h-12 text-rose-400 fill-rose-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-gray-800 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{selNote.title}</h3>
                    <p className="text-xs text-gray-400 mb-4">From {selNote.from} • {selNote.date.toLocaleDateString()}</p>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif' }}>{selNote.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3">
                  {!notes.length ? <div className="text-center py-12"><Mail className="w-12 h-12 text-rose-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No notes yet 💌</p></div> : (
                    <div className="space-y-2">{notes.map(n => (
                      <div key={n.id} onClick={() => setSelNote(n)} className={`p-3 rounded-xl border cursor-pointer hover:shadow-md ${!n.read ? 'bg-rose-50 border-rose-200' : 'bg-white border-pink-100'}`}>
                        <div className="flex items-center gap-2">
                          {n.read ? <MailOpen className="w-4 h-4 text-gray-400" /> : <Mail className="w-4 h-4 text-rose-500" />}
                          <div className="flex-1 min-w-0"><h4 className="font-semibold text-gray-800 text-sm truncate">{n.title}</h4><p className="text-xs text-gray-500 truncate">{n.content}</p><p className="text-xs text-gray-400">From {n.from}</p></div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DATE IDEAS */}
          {tab === 'dates' && (
            <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-rose-500" /><b className="text-gray-700">Date Ideas</b></div>
                <button onClick={spinDate} disabled={spinning} className="p-2 bg-rose-500 text-white rounded-xl"><RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {!idea ? (
                  <div className="text-center py-12"><Sparkles className="w-14 h-14 text-rose-300 mx-auto mb-3" /><p className="text-gray-500 mb-4">Need date ideas?</p><button onClick={spinDate} className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm">Surprise Us!</button></div>
                ) : (
                  <div className={`bg-white rounded-2xl border border-pink-100 p-5 text-center transition-all ${spinning ? 'opacity-50 scale-95' : ''}`}>
                    <div className="text-5xl mb-3">{idea.i}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{idea.t}</h3>
                    <div className="flex justify-center gap-2 mb-3"><span className="text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full">{idea.c}</span><span className={`text-xs px-2 py-1 rounded-full ${idea.b === 'Free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{idea.b}</span></div>
                    <p className="text-gray-600 mb-4">{idea.d}</p>
                    <div className="flex gap-2">
                      <button onClick={spinDate} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4" />Another</button>
                      <button onClick={() => { if (!saved.find(s => s.t === idea.t)) setSaved([...saved, idea]); }} className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-1"><Heart className="w-4 h-4" />Save</button>
                    </div>
                  </div>
                )}
                {saved.length > 0 && <div className="mt-5"><h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500 fill-rose-500" />Saved ({saved.length})</h4><div className="space-y-2">{saved.map((s, i) => <div key={i} className="bg-white rounded-xl border border-pink-100 p-3 flex items-center gap-2"><span className="text-2xl">{s.i}</span><div><p className="font-medium text-sm text-gray-800">{s.t}</p><p className="text-xs text-gray-500">{s.d}</p></div></div>)}</div></div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
