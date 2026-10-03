import React, { useState, useEffect } from 'react';
import { Heart, X, Send, Mail, MailOpen } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Note { id: string; fromUserId: string; toUserId: string; title: string; content: string; isRead: boolean; createdAt: any; }

export default function LoveNotes({ userId, partnerId, userName = 'You', partnerName = 'Partner' }: { userId: string; partnerId: string; userName?: string; partnerName?: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [show, setShow] = useState(false);
  const [sel, setSel] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const chatId = [userId, partnerId].sort().join('_');

  useEffect(() => {
    return onSnapshot(query(collection(db, 'chats', chatId, 'loveNotes'), orderBy('createdAt', 'desc')), (s) => {
      setNotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
    });
  }, [chatId]);

  const inbox = notes.filter(n => n.toUserId === userId);
  const sent = notes.filter(n => n.fromUserId === userId);
  const unread = inbox.filter(n => !n.isRead).length;

  const send = async () => {
    if (!title.trim() || !content.trim()) return;
    await addDoc(collection(db, 'chats', chatId, 'loveNotes'), { fromUserId: userId, toUserId: partnerId, title: title.trim(), content: content.trim(), isRead: false, createdAt: serverTimestamp() });
    setTitle(''); setContent(''); setShow(false); setTab('sent');
  };

  const open = async (n: Note) => {
    setSel(n);
    if (!n.isRead && n.toUserId === userId) {
      try { await updateDoc(doc(db, 'chats', chatId, 'loveNotes', n.id), { isRead: true }); } catch {}
    }
  };

  const fmtDate = (ts: any) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString(); };

  return (
    <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-rose-500" /><b className="text-gray-700 text-sm">Love Notes</b>{unread > 0 && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>}</div>
        <button onClick={() => { setShow(!show); setSel(null); }} className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs">{show ? '✕' : '+ Write'}</button>
      </div>

      {show ? (
        <div className="p-3 space-y-2">
          <div className="text-center mb-2"><Heart className="w-8 h-8 text-rose-400 fill-rose-400 mx-auto" /><p className="text-xs text-gray-500 mt-1">Write to {partnerName}</p></div>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <textarea placeholder="Pour your heart out 💕" value={content} onChange={e => setContent(e.target.value)} rows={6} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" style={{ fontFamily: 'Georgia, serif' }} />
          <button onClick={send} className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-1"><Send className="w-3.5 h-3.5" />Send with Love</button>
        </div>
      ) : sel ? (
        <div className="flex-1 overflow-y-auto p-4">
          <button onClick={() => setSel(null)} className="text-sm text-rose-500 mb-3">← Back</button>
          <div className="bg-white rounded-2xl border border-pink-100 p-5 text-center">
            <Heart className="w-10 h-10 text-rose-400 fill-rose-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{sel.title}</h3>
            <p className="text-xs text-gray-400 mb-3">From {sel.fromUserId === userId ? userName : partnerName} • {fmtDate(sel.createdAt)}</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-center" style={{ fontFamily: 'Georgia, serif' }}>{sel.content}</p>
            <button onClick={async () => { await deleteDoc(doc(db, 'chats', chatId, 'loveNotes', sel.id)); setSel(null); }} className="mt-4 text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex border-b border-pink-100">
            <button onClick={() => setTab('inbox')} className={`flex-1 py-2 text-xs font-medium ${tab === 'inbox' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-gray-500'}`}>Inbox ({inbox.length})</button>
            <button onClick={() => setTab('sent')} className={`flex-1 py-2 text-xs font-medium ${tab === 'sent' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-gray-500'}`}>Sent ({sent.length})</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {(tab === 'inbox' ? inbox : sent).length === 0 ? (
              <div className="text-center py-12"><Mail className="w-12 h-12 text-rose-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">{tab === 'inbox' ? 'No notes yet 💌' : 'Write one!'}</p></div>
            ) : (
              <div className="space-y-2">
                {(tab === 'inbox' ? inbox : sent).map(n => (
                  <div key={n.id} onClick={() => open(n)} className={`p-3 rounded-xl border cursor-pointer hover:shadow-md ${!n.isRead && n.toUserId === userId ? 'bg-rose-50 border-rose-200' : 'bg-white border-pink-100'}`}>
                    <div className="flex items-center gap-2">
                      {n.isRead ? <MailOpen className="w-4 h-4 text-gray-400" /> : <Mail className="w-4 h-4 text-rose-500" />}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-xs truncate">{n.title}</h4>
                        <p className="text-[10px] text-gray-500 truncate">{n.content}</p>
                        <p className="text-[10px] text-gray-400">{tab === 'inbox' ? `From ${partnerName}` : `To ${partnerName}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
