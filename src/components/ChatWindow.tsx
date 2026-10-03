import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Loader2, Search, Download, Heart, X, MoreHorizontal, Reply, Image as ImageIcon } from 'lucide-react';
import { subscribeToMessages, sendMessage, sendMessageWithImage } from '../lib/firebase';

interface Message { id: string; text: string; senderId: string; createdAt: any; }
interface Props { userId: string; partnerId: string; userName?: string; partnerName?: string; }

const QUICK = ['❤️ Love you!', 'Miss you 💕', 'How are you?', 'Call me?', 'Thinking of you 🥰'];
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function ChatWindow({ userId, partnerId, userName = 'You', partnerName = 'Partner' }: Props) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToMessages(userId, partnerId, (m) => setMsgs(m));
  }, [userId, partnerId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const parseMsg = (m: Message) => {
    try { const p = JSON.parse(m.text); return { text: p.text || m.text, image: p.image }; }
    catch { return { text: m.text, image: undefined }; }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !image) || sending) return;
    const text = input.trim();
    setInput(''); setImage(null); setSending(true); setReplyTo(null);
    try {
      if (image) await sendMessageWithImage(userId, partnerId, JSON.stringify({ text: text || '📷 Photo', image }), image);
      else await sendMessage(userId, partnerId, text);
    } catch (err) { setInput(text); }
    finally { setSending(false); }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return alert('Max 5MB');
    const r = new FileReader();
    r.onload = (ev) => setImage(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const exportChat = () => {
    if (!msgs.length) return alert('No messages!');
    let t = `💕 LoveLink Chat Export\n${'='.repeat(50)}\nExported: ${new Date().toLocaleString()}\nParticipants: ${userName} & ${partnerName}\nMessages: ${msgs.length}\n${'='.repeat(50)}\n\n`;
    let last = '';
    msgs.forEach(m => {
      const d = m.createdAt?.toDate?.() || new Date(m.createdAt);
      const ds = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (ds !== last) { t += `\n${'─'.repeat(50)}\n📅 ${ds}\n${'─'.repeat(50)}\n\n`; last = ds; }
      const name = m.senderId === userId ? userName : partnerName;
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const parsed = parseMsg(m);
      t += `[${time}] ${name}:\n  ${parsed.text}\n${parsed.image ? '  [Image attached]\n' : ''}\n`;
    });
    t += `\n${'='.repeat(50)}\nMade with 💕 LoveLink\n`;
    const blob = new Blob([t], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lovelink-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const fmtTime = (ts: any) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filtered = search ? msgs.filter(m => parseMsg(m).text.toLowerCase().includes(search.toLowerCase())) : msgs;
  const grouped: { date: string; msgs: Message[] }[] = [];
  let ld = '';
  filtered.forEach(m => {
    const d = fmtDate(m.createdAt);
    if (d !== ld) { grouped.push({ date: d, msgs: [m] }); ld = d; }
    else grouped[grouped.length - 1].msgs.push(m);
  });

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-pink-100 bg-white/80">
        <span className="text-xs text-gray-500">{msgs.length} msgs{search ? ` • ${filtered.length} found` : ''}</span>
        <div className="flex gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 text-gray-400 hover:text-pink-500 rounded-lg"><Search className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="p-1.5 text-gray-400 hover:text-pink-500 rounded-lg"><MoreHorizontal className="w-4 h-4" /></button>
            {menu && <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border py-1 w-44 z-10"><button onClick={() => { exportChat(); setMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-pink-50 flex items-center gap-2"><Download className="w-4 h-4" />Export Chat (.txt)</button></div>}
          </div>
        </div>
      </div>

      {showSearch && <div className="px-3 py-1.5 border-b border-pink-100 flex items-center gap-2"><Search className="w-4 h-4 text-gray-400" /><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm bg-transparent focus:outline-none" autoFocus />{search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}</div>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {!msgs.length ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-3"><Smile className="w-7 h-7 text-rose-400" /></div>
            <p className="text-gray-500 text-sm">Start chatting! 💕</p>
          </div>
        ) : grouped.map((g, i) => (
          <div key={i}>
            <div className="flex justify-center my-3"><span className="bg-gray-100 text-gray-500 text-xs px-3 py-0.5 rounded-full">{g.date}</span></div>
            {g.msgs.map(m => {
              const own = m.senderId === userId;
              const p = parseMsg(m);
              const name = own ? userName : partnerName;
              return (
                <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'} mb-2 group`}>
                  <div className="relative max-w-[75%]">
                    {replyTo && <div className={`text-xs px-2 py-1 rounded mb-1 border-l-2 ${own ? 'bg-pink-100/50 border-pink-400 text-pink-700' : 'bg-gray-100 border-gray-400 text-gray-600'}`}><span className="font-semibold">{name}</span><p className="truncate">{parseMsg(replyTo).text}</p></div>}
                    <div className={`px-3 py-2 rounded-2xl ${own ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md' : 'bg-white border border-gray-100 rounded-bl-md'}`}>
                      <p className={`text-[10px] font-semibold mb-0.5 ${own ? 'text-white/80' : 'text-pink-500'}`}>{name}</p>
                      {p.image && <img src={p.image} alt="" className="rounded-lg max-w-full mb-1 cursor-pointer" onClick={() => window.open(p.image, '_blank')} />}
                      {p.text && p.text !== '📷 Photo' && <p className="text-sm whitespace-pre-wrap break-words">{p.text}</p>}
                      <p className={`text-[10px] mt-0.5 ${own ? 'text-white/70 text-right' : 'text-gray-400'}`}>{fmtTime(m.createdAt)}</p>
                    </div>
                    {/* Hover actions */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${own ? '-left-16' : '-right-16'} hidden group-hover:flex gap-1`}>
                      <button onClick={() => setReplyTo(m)} className="p-1 bg-white border rounded-full shadow-sm hover:bg-pink-50"><Reply className="w-3 h-3 text-gray-500" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick replies */}
      {!input && msgs.length > 0 && <div className="px-2 py-1 border-t border-pink-50 flex gap-1.5 overflow-x-auto">{QUICK.map(q => <button key={q} onClick={() => setInput(q)} className="flex-shrink-0 px-2.5 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100">{q}</button>)}</div>}

      {/* Reply preview */}
      {replyTo && <div className="px-3 py-1.5 bg-pink-50 border-t border-pink-100 flex items-center gap-2"><Reply className="w-3.5 h-3.5 text-pink-500" /><div className="flex-1 min-w-0"><p className="text-xs text-pink-600">Replying to {replyTo.senderId === userId ? userName : partnerName}</p><p className="text-xs text-gray-500 truncate">{parseMsg(replyTo).text}</p></div><button onClick={() => setReplyTo(null)}><X className="w-3.5 h-3.5 text-gray-400" /></button></div>}

      {/* Image preview */}
      {image && <div className="px-3 py-1.5 bg-pink-50 border-t border-pink-100 flex items-center gap-2"><img src={image} alt="" className="w-12 h-12 object-cover rounded" /><span className="text-xs text-gray-600 flex-1">Image ready</span><button onClick={() => setImage(null)}><X className="w-3.5 h-3.5 text-gray-400" /></button></div>}

      {/* Input */}
      <div className="p-2 border-t border-pink-100 bg-white/80">
        <form onSubmit={send} className="flex items-center gap-1.5">
          <input type="file" ref={fileRef} onChange={handleImage} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-gray-400 hover:text-pink-500 rounded-lg"><ImageIcon className="w-4 h-4" /></button>
          <input type="text" placeholder="Type..." value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <button type="submit" disabled={(!input.trim() && !image) || sending} className="p-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
        </form>
      </div>
    </div>
  );
}
