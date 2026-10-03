import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type MediaConnection } from 'peerjs';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, AlertCircle } from 'lucide-react';
import { acceptCall, subscribeToCallStatus, endCall as endCallDb } from '../lib/firebase';

interface Props { callType: 'video' | 'voice'; currentUserId: string; partnerId: string; isCaller: boolean; onEndCall: () => void; }

export default function CallModal({ callType, currentUserId, partnerId, isCaller, onEndCall }: Props) {
  const [status, setStatus] = useState<'init' | 'ringing' | 'connecting' | 'connected' | 'ended'>('init');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState('');
  const [time, setTime] = useState(0);

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getStream = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' ? { width: 640, height: 480 } : false });
      streamRef.current = s;
      if (localRef.current && callType === 'video') localRef.current.srcObject = s;
      return s;
    } catch (e: any) {
      setError(e.name === 'NotAllowedError' ? 'Camera/mic access denied' : 'No camera/mic found');
      throw e;
    }
  }, [callType]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    callRef.current?.close();
    peerRef.current?.destroy();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const end = async () => {
    cleanup();
    setStatus('ended');
    try { await endCallDb(currentUserId, partnerId); } catch {}
    setTimeout(onEndCall, 800);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const stream = await getStream();
        const peer = new Peer(`lovelink-${currentUserId}`, { debug: 0 });
        peerRef.current = peer;

        peer.on('open', () => {
          if (!mounted) return;
          if (isCaller) {
            setStatus('ringing');
            const call = peer.call(`lovelink-${partnerId}`, stream);
            callRef.current = call;
            call.on('stream', (remote) => { if (mounted) { setStatus('connected'); if (remoteRef.current) remoteRef.current.srcObject = remote; } });
            call.on('close', () => { if (mounted) end(); });
          }
        });

        peer.on('call', (incoming) => {
          if (!mounted) return;
          callRef.current = incoming;
          setStatus('connecting');
          acceptCall(currentUserId, partnerId);
          incoming.answer(stream);
          incoming.on('stream', (remote) => { if (mounted) { setStatus('connected'); if (remoteRef.current) remoteRef.current.srcObject = remote; } });
          incoming.on('close', () => { if (mounted) end(); });
        });

        peer.on('error', (e) => {
          if (!mounted) return;
          if (e.type === 'peer-unavailable') setError('Partner not available');
          setTimeout(end, 1500);
        });

        if (isCaller) {
          const unsub = subscribeToCallStatus(currentUserId, partnerId, (d) => {
            if (!mounted) return;
            if (d?.status === 'accepted') setStatus('connecting');
            else if (d?.status === 'ended') end();
          });
          return () => unsub();
        }
      } catch { if (mounted && !error) setError('Failed to start call'); }
    };
    init();
    return () => { mounted = false; cleanup(); };
  }, []);

  useEffect(() => {
    if (status === 'connected') timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(!muted);
  };

  const toggleVideo = () => {
    if (callType !== 'video') return;
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoOff(!videoOff);
  };

  const statusText = { init: 'Starting...', ringing: 'Calling...', connecting: 'Connecting...', connected: 'Connected', ended: 'Ended' };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="flex-1 relative flex items-center justify-center">
        {callType === 'video' ? (
          <div className="absolute inset-0">
            <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
            {status !== 'connected' && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3"><Phone className="w-10 h-10 text-white animate-pulse" /></div>
                  <p className="text-white text-lg">{statusText[status]}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${status === 'connected' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse'}`}><Phone className="w-12 h-12 text-white" /></div>
            <h2 className="text-white text-xl font-bold mb-1">{statusText[status]}</h2>
            {status === 'connected' && <p className="text-white/60">{fmt(time)}</p>}
          </div>
        )}

        {callType === 'video' && status === 'connected' && (
          <div className="absolute bottom-20 right-4 w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <video ref={localRef} autoPlay playsInline muted className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''} transform scale-x-[-1]`} />
            {videoOff && <div className="w-full h-full bg-gray-700 flex items-center justify-center"><VideoOff className="w-6 h-6 text-white/50" /></div>}
          </div>
        )}

        {callType === 'voice' && <video ref={localRef} autoPlay playsInline muted className="hidden" />}

        {error && <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white px-3 py-2 rounded-xl flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
      </div>

      <div className="bg-gray-900/90 border-t border-white/10 px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>{muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
          <button onClick={end} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><PhoneOff className="w-6 h-6" /></button>
          {callType === 'video' ? (
            <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center ${videoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>{videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}</button>
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white"><Volume2 className="w-5 h-5" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
