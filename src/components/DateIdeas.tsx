import React, { useState } from 'react';
import { Heart, RefreshCw, Sparkles } from 'lucide-react';

const IDEAS = [
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
  { t: 'Spa Night', d: 'Face masks, candles, relaxing music!', i: '🧖', c: 'Relaxation', b: '$$' },
  { t: 'Photo Hunt', d: 'Take photos of things around town!', i: '📸', c: 'Adventure', b: 'Free' },
];

export default function DateIdeas() {
  const [idea, setIdea] = useState<typeof IDEAS[0] | null>(null);
  const [saved, setSaved] = useState<typeof IDEAS>([]);
  const [spin, setSpin] = useState(false);

  const go = () => {
    setSpin(true);
    setTimeout(() => { setIdea(IDEAS[Math.floor(Math.random() * IDEAS.length)]); setSpin(false); }, 500);
  };

  return (
    <div className="flex flex-col h-full bg-white/60 rounded-2xl border border-pink-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-pink-100 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-rose-500" /><b className="text-gray-700 text-sm">Date Ideas</b></div>
        <button onClick={go} disabled={spin} className="p-1.5 bg-rose-500 text-white rounded-lg"><RefreshCw className={`w-3.5 h-3.5 ${spin ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!idea ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-rose-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">Need date ideas?</p>
            <button onClick={go} className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm flex items-center gap-1 mx-auto"><Sparkles className="w-3.5 h-3.5" />Surprise Us!</button>
          </div>
        ) : (
          <div className={`bg-white rounded-2xl border border-pink-100 p-5 text-center transition-all ${spin ? 'opacity-50 scale-95' : ''}`}>
            <div className="text-4xl mb-2">{idea.i}</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{idea.t}</h3>
            <div className="flex justify-center gap-1.5 mb-3">
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{idea.c}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${idea.b === 'Free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{idea.b}</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">{idea.d}</p>
            <div className="flex gap-2">
              <button onClick={go} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs flex items-center justify-center gap-1"><RefreshCw className="w-3 h-3" />Another</button>
              <button onClick={() => { if (!saved.find(s => s.t === idea.t)) setSaved([...saved, idea]); }} className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-xs flex items-center justify-center gap-1"><Heart className="w-3 h-3" />Save</button>
            </div>
          </div>
        )}

        {saved.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700 text-xs mb-2 flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500 fill-rose-500" />Saved ({saved.length})</h4>
            <div className="space-y-1.5">
              {saved.map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-pink-100 p-2.5 flex items-center gap-2">
                  <span className="text-xl">{s.i}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 text-xs">{s.t}</p><p className="text-[10px] text-gray-500 truncate">{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
