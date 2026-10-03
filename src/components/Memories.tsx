import React, { useState, useEffect } from 'react';
import { Heart, Plus, X, Calendar, Sparkles, BookHeart } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Memory { id: string; title: string; description: string; date: string; }

export default function Memories({ userId, partnerId }: { userId: string; partnerId: string }) {
  const [mems, setMems] = useState<Memory[]>([]);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const chatId = [userId, partnerId].sort().join('_');

  useEffect(() => {
    return onSnapshot(query(collection(db, 'chats', chatId, 'memories'), orderBy('date', 'desc')), (s) => {
      setMems(s.docs.map(d => ({ id: d.id, ...d.data() } as Memory)));
    });
  }, [chatId]);

  const save = async () => {
    if (!title.trim()) return;
    await addDoc(collection(db, 'chats', chatId, 'memories'), { title: title.trim(), description: desc.trim(), date, createdBy: userId, createdAt: serverTimestamp() });
    setTitle(''); setDesc(''); setShow(false);
  };

  return (
    <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-2"><BookHeart className="w-4 h-4 text-rose-500" /><b className="text-gray-700 text-sm">Memories</b><span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{mems.length}</span></div>
        <button onClick={() => setShow(!show)} className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs">{show ? '✕' : '+ Add'}</button>
      </div>

      {show && (
        <div className="p-3 border-b border-pink-100 space-y-2">
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <textarea placeholder="What happened?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm" />
          <button onClick={save} className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5" />Save</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!mems.length ? (
          <div className="text-center py-12"><BookHeart className="w-12 h-12 text-rose-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No memories yet 💕</p></div>
        ) : mems.map(m => (
          <div key={m.id} className="bg-white rounded-xl border border-pink-100 p-3">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400 fill-rose-400" />{m.title}</h3>
              <button onClick={() => deleteDoc(doc(db, 'chats', chatId, 'memories', m.id))} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
            {m.description && <p className="text-xs text-gray-600 mb-1">{m.description}</p>}
            <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{new Date(m.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
