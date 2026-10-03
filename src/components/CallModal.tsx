import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Peer, { type MediaConnection } from 'peerjs';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, AlertCircle } from 'lucide-react';
import { acceptCall, subscribeToCallStatus, endCall as endCallDb } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const endedRef = useRef(false);

  // Attach a stream to a <video> element reliably (autoplay can be blocked on mobile).
  const attach = (el: HTMLVideoElement | null, s: MediaStream) => {
    if (!el) return;
    el.srcObject = s;
    el.onloadedmetadata = () => { el.play().catch(() => {}); };
    el.play().catch(() => {});
  };

  const endOnce = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanup();
    setStatus('ended');
    try { await endCallDb(currentUserId, partnerId); } catch {}
    setTimeout(onEndCall, 800);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getStream = useCallback(async () => {
    // getUserMedia only exists on HTTPS (or localhost) – this is the #1 reason
    // calls fail when opening the dev URL from a phone over http://IP-address.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Insecure connection: open the app over HTTPS to use calls');
      throw new Error('insecure-context');
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' ? { width: 640, height: 480 } : false });
      streamRef.current = s;
      if (localRef.current && callType === 'video') localRef.current.srcObject = s;
      return s;
    } catch (e: any) {
      if (e.name === 'NotAllowedError') setError('Camera/mic permission denied – allow it in browser settings');
      else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') setError('No camera/mic found on this device');
      else if (e.name === 'NotReadableError') setError('Camera/mic busy in another app');
      else setError('Could not access camera/microphone');
      throw e;
    }
  }, [callType]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    callRef.current?.close();
    peerRef.current?.destroy();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // 1. Get local media FIRST – without this no call can exist.
        const stream = await getStream();
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        // 2. Use a RANDOM peer id. The previous code used `lovelink-<userId>` as the
        //    PeerJS id, which meant both users could only ever hold ONE shared id –
        //    the second device got an "ID taken" error and calls silently failed.
        const myId = uuidv4();
        const peer = new Peer(myId, { debug: 1 });
        peerRef.current = peer;

        peer.on('error', (e: any) => {
          if (!mounted) return;
          console.error('[call] peer error:', e);
          if (e.type === 'peer-unavailable') setError('Partner is offline – ask them to open LoveLink');
          else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') setError('Network / signaling server problem');
          else if (e.type === 'browser-incompatible') setError('Browser does not support WebRTC');
          else setError('Call error: ' + (e.type || e.message || 'unknown'));
          setTimeout(endOnce, 2000);
        });

        peer.on('call', (incoming) => {
          if (!mounted) return;
          callRef.current = incoming;
          setStatus('connecting');
          acceptCall(currentUserId, partnerId).catch(() => {});
          incoming.answer(stream);
          incoming.on('stream', (remote) => {
            if (!mounted) return;
            setStatus('connected');
            attach(remoteRef.current, remote);
          });
          incoming.on('close', () => { if (mounted) endOnce(); });
        });

        // 3. Advertise our current PeerJS id in Firestore so the partner can dial it.
        //    (Previously both sides tried to dial a fixed id that was never registered.)
        await setDoc(doc(db, 'users', currentUserId), {
          peerId: myId,
          onlineAt: serverTimestamp(),
        }, { merge: true });

        peer.on('open', () => {
          if (!mounted) return;
          if (isCaller) {
            setStatus('ringing');
            const dial = async () => {
              try {
                const snap = await getDoc(doc(db, 'users', partnerId));
                const partnerPeerId: string | undefined = snap.data()?.peerId;
                if (!partnerPeerId) {
                  setError('Partner is not online – they must open the app first');
                  setTimeout(endOnce, 2500);
                  return;
                }
                const call = peer.call(partnerPeerId, stream, { metadata: { type: callType } });
                callRef.current = call;
                call.on('stream', (remote) => {
                  if (!mounted) return;
                  setStatus('connected');
                  attach(remoteRef.current, remote);
                });
                call.on('close', () => { if (mounted) endOnce(); });
                call.on('error', () => { if (mounted) { setError('Call failed'); setTimeout(endOnce, 1500); } });
              } catch {
                if (mounted) { setError('Could not start call'); setTimeout(endOnce, 1500); }
              }
            };
            dial();
          }
        });

        if (isCaller) {
          const unsub = subscribeToCallStatus(currentUserId, partnerId, (d) => {
            if (!mounted) return;
            if (d?.status === 'accepted') setStatus('connecting');
            else if (d?.status === 'ended') endOnce();
          });
          return () => unsub();
        }
      } catch {
        if (mounted) setError('Failed to access camera/microphone');
      }
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

        {callType === 'video' && (
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
          <button onClick={endOnce} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><PhoneOff className="w-6 h-6" /></button>
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
