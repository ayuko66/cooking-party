'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChefHat, Send, Users, User, Clipboard as ClipboardIcon, ClipboardCheck as ClipboardCheckIcon, RefreshCw, Sparkles, Clock, Crown } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Room, Player } from '@/lib/store';
import { InkLayout } from '@/components/ui/ink-layout';
import { InkButton } from '@/components/ui/ink-button';
import { InkCard } from '@/components/ui/ink-card';
import { cn } from '@/lib/utils';
import { useDevMode } from '@/components/dev-mode-provider';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = decodeURIComponent(params.roomId as string).toUpperCase();
  const isDev = useDevMode();

  const [nickname, setNickname] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [ingredient, setIngredient] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [stateVersion, setStateVersion] = useState<number | null>(null);
  const versionRef = useRef<number | null>(null);

  useEffect(() => {
    versionRef.current = stateVersion;
  }, [stateVersion]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchState = useCallback(async () => {
    if (!player) return;

    try {
      const params = new URLSearchParams({ roomId });
      const since = versionRef.current;
      if (since !== null) params.set('sinceVersion', String(since));

      const res = await fetch(`/api/rooms/state?${params.toString()}`, { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 204) {
        setNotFoundCount(0);
        setIsReconnecting(false);
        return;
      }

      if (res.status === 404) {
        setNotFoundCount((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            setError('部屋が見つかりません');
            setIsReconnecting(true);
            router.push('/');
          } else {
            setIsReconnecting(false);
          }
          return next;
        });
        return;
      }

      if (!res.ok) {
        setIsReconnecting(false);
        return;
      }

      const data = await res.json();
      setRoom(data);
      if (typeof data.version === 'number') {
        setStateVersion(data.version);
      }
      setNotFoundCount(0);
      setIsReconnecting(false);
    } catch (e) {
      console.error(e);
      setIsReconnecting(false);
    }
  }, [player, roomId, router]);

  useEffect(() => {
    if (!player) return;

    const pollingInterval = (() => {
      if (!room || room.phase === 'LOBBY') return 2500;
      if (room.phase === 'COUNTDOWN') return 800;
      if (room.phase === 'COOKING') return 1500;
      if (room.phase === 'RESULT') return null;
      return 2500;
    })();

    fetchState();
    if (!pollingInterval) return;

    const interval = setInterval(fetchState, pollingInterval);
    return () => clearInterval(interval);
  }, [player, room?.phase, fetchState]);

  useEffect(() => {
    if (room?.phase === 'COUNTDOWN' && room.countdownEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((room.countdownEndTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
      };
      updateTimer();
      const timer = setInterval(updateTimer, 250);
      return () => clearInterval(timer);
    }
  }, [room?.phase, room?.countdownEndTime]);

  useEffect(() => {
    if (timeLeft === 0 && room?.phase === 'COUNTDOWN' && room.players[0].id === player?.id) {
       fetch('/api/rooms/cook', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ roomId, isDev }),
         cache: 'no-store',
       });
    }
  }, [timeLeft, room?.phase, room?.players, player?.id, roomId]);


  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, nickname }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setPlayer(data.player);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('参加に失敗しました');
    }
  };

  const handleStart = async () => {
    await fetch('/api/rooms/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId }),
      cache: 'no-store',
    });
  };

  const handleSubmitIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient.trim() || !player) return;

    const res = await fetch('/api/rooms/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId, playerId: player.id, text: ingredient }),
      cache: 'no-store',
    });

    if (res.ok) {
      setIngredient('');
    }
  };

  // --- COMMONS ---
  const containerClass = "flex-1 flex flex-col items-center w-full max-w-3xl mx-auto gap-8 p-4 md:p-8";
  const labelClass = "block text-sm font-bold text-ink-cyan uppercase tracking-wider mb-1 px-2";
  // Neon outline input (align with TOP ROOM ID sizing)
  const inputClass = cn(
    "w-full rounded-2xl md:rounded-3xl transition-all font-mono font-black uppercase",
    "h-[30px] px-4 md:px-5 text-sm md:text-base tracking-widest",
    "backdrop-blur-sm border-2 md:border-3",
    "bg-white/60 text-ink-base border-ink-cyan/70 focus:border-ink-cyan placeholder:text-ink-base/50",
    "focus:outline-none focus:ring-2 focus:ring-ink-cyan/40 focus:ring-offset-2 focus:ring-offset-ink-base"
  );
  const cardBaseClass = "bg-ink-surface border-2 border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden";

  // --- JOIN SCREEN ---
  if (!player) {
    return (
      <InkLayout className="items-center justify-center p-4">
        {isReconnecting && (
          <div className="w-full max-w-5xl mx-auto mb-3 text-center">
            <span className="inline-block bg-amber-300 text-black font-black text-xs px-3 py-2 rounded-full shadow-md border border-black/10">
              再接続中…
            </span>
          </div>
        )}
        <div className="w-full max-w-5xl grid items-stretch gap-6 md:gap-8 md:grid-cols-[1.05fr,0.95fr]">

          {/* Hero / Guidance */}
          <InkCard variant="glass" className="p-0 overflow-hidden border-0 shadow-2xl order-2 md:order-1">
            <div className="relative space-y-6 md:space-y-8">
              <div className="absolute -inset-10 bg-gradient-to-br from-ink-magenta/15 via-transparent to-ink-cyan/15 blur-3xl" />
              <div className="absolute top-3 left-6 w-24 h-8 tape rotate-2 opacity-80" />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-ink-cyan">Waiting Lobby</p>
                  <h1 className="text-4xl md:text-5xl font-black text-white italic leading-tight text-shadow-lg">
                    JOIN <span className="text-ink-cyan drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]">ROOM</span>
                  </h1>
                  <p className="text-white/80 font-bold leading-7 md:leading-8 text-base md:text-lg max-w-xl">
                    ニックネームを入力して参加ボタンをタップ。合図が来たらみんなで材料を投げ込もう！
                  </p>
                </div>
                <div className="relative shrink-0 isolation-auto">
                  <div className="absolute -top-3 right-2 w-14 h-7 tape rotate-3 opacity-80" />
                  <div className="relative z-20 bg-[#ffffff] text-ink-base font-black text-3xl md:text-4xl px-6 py-3 rounded-md border-[5px] border-black rotate-1 shadow-[0_10px_0_rgba(0,0,0,0.4)] font-mono tracking-[0.28em] drop-shadow-lg">
                    {roomId}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-black/40 rounded-2xl px-4 py-3 text-left shadow-inner">
                  <p className="text-ink-cyan text-xs md:text-sm font-black uppercase tracking-[0.25em] mb-2">Step 1</p>
                  <p className="text-white font-bold leading-snug text-base md:text-lg">ニックネームを決める</p>
                </div>
                <div className="bg-black/40 rounded-2xl px-4 py-3 text-left shadow-inner">
                  <p className="text-ink-magenta text-xs md:text-sm font-black uppercase tracking-[0.25em] mb-2">Step 2</p>
                  <p className="text-white font-bold leading-snug text-base md:text-lg">参加して合流！</p>
                </div>
                <div className="bg-black/40 rounded-2xl px-4 py-3 text-left shadow-inner">
                  <p className="text-ink-lime text-xs md:text-sm font-black uppercase tracking-[0.25em] mb-2">Step 3</p>
                  <p className="text-white font-bold leading-snug text-base md:text-lg">スタート合図を待とう</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 bg-ink-base/70 rounded-2xl px-4 py-3 shadow-inner">
                <div className="px-3 py-1 bg-ink-cyan text-ink-base text-[11px] font-black uppercase tracking-[0.25em] rounded-full shrink-0">
                  Room URL
                </div>
                <div className="flex-1 min-w-[200px] px-3 py-2 bg-black/50 rounded-xl border border-white/5 font-mono text-sm text-white/80 truncate select-all">
                  {shareUrl || '読み込み中...'}
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2 bg-white text-ink-base hover:bg-gray-100 rounded-xl border-4 border-black transition-transform active:translate-y-[1px] shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
                  aria-label="URLをコピー"
                >
                  {copied ? <ClipboardCheckIcon className="w-5 h-5 text-ink-base" /> : <ClipboardIcon className="w-5 h-5 text-ink-base" />}
                </button>
              </div>
            </div>
          </InkCard>

          {/* Join Form */}
          <InkCard variant="neon" decoration="splat" className="p-0 shadow-2xl border-0 order-1 md:order-2">
            <div className="relative space-y-6 md:space-y-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-ink-cyan text-ink-base text-[11px] font-black uppercase tracking-[0.25em] rounded-full">
                    Room
                  </div>
                  <span className="font-mono text-white/70 tracking-[0.3em] text-sm">{roomId}</span>
                </div>
                <div className="bg-black/60 text-white px-3 py-1 rounded-xl text-xs font-bold border border-white/10">
                  すぐ参加できます
                </div>
              </div>

              <form onSubmit={handleJoin} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="nickname" className={labelClass}>Nickname</label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className={cn(inputClass, "bg-white/90 text-ink-base border-ink-cyan/80 shadow-inner")}
                    placeholder="イカした名前"
                    maxLength={10}
                  />
                  <p className="text-sm text-white/60 font-medium px-2">最大10文字・みんなに見える名前だよ</p>
                </div>

                {error && (
                  <div role="alert" className="text-white text-sm font-bold bg-red-500/90 p-4 rounded-xl text-center border-4 border-red-700 shadow-md rotate-1">
                    {error}
                  </div>
                )}

                <InkButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!nickname.trim()}
                  className="w-full h-14 md:h-16 text-xl font-black shadow-lg transform active:scale-95 transition-transform mb-[10px]"
                >
                  {nickname.trim() ? '参加する！' : '名前を入力してね'}
                </InkButton>
              </form>
            </div>
          </InkCard>

        </div>
      </InkLayout>
    );
  }

  if (!room) return (
    <InkLayout className="items-center justify-center">
      {isReconnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-block bg-amber-300 text-black font-black text-xs px-3 py-2 rounded-full shadow-md border border-black/10">
            再接続中…
          </span>
        </div>
      )}
      <div className="text-4xl font-black text-white animate-bounce drop-shadow-lg" role="status">
        LOADING...
      </div>
    </InkLayout>
  );

  const isHost = room.players[0]?.id === player.id;

  return (
    <InkLayout>
      {isReconnecting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <span className="inline-block bg-amber-300 text-black font-black text-xs px-3 py-2 rounded-full shadow-md border border-black/10">
            再接続中…
          </span>
        </div>
      )}
      {/* HEADER */}
      <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center bg-ink-base/90 backdrop-blur-md p-2 pl-4 pr-2 rounded-full border-2 border-white/20 shadow-xl">
          <div className="flex items-center gap-[3px]">
            <div className="bg-gradient-to-br from-ink-magenta to-ink-purple p-2.5 rounded-full shadow-inner border-2 border-white/10">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] font-bold text-ink-cyan uppercase tracking-widest mb-1">Room ID</div>
              <div className="text-2xl font-black text-white font-mono tracking-tighter">{roomId}</div>
            </div>
          </div>
          <div className="flex items-center gap-[3px] bg-ink-surface px-5 py-2.5 rounded-full border-2 border-ink-lime/30 shadow-inner">
            <Users className="w-5 h-5 text-ink-lime" />
            <span className="text-2xl font-black text-white tabular-nums leading-none">{room.players.length}</span>
          </div>
        </div>
      </header>

      {/* LOBBY PHASE */}
      {room.phase === 'LOBBY' && (
        <main className={containerClass}>
          
          <section className="w-full bg-ink-cyan/10 border-4 border-ink-cyan/30 p-5 md:p-7 rounded-3xl text-center backdrop-blur-sm relative overflow-hidden space-y-3">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ink-cyan to-transparent opacity-50" />
            <p className="text-lg md:text-xl font-bold text-white leading-relaxed relative z-10">
             みんなで、<span className="text-ink-cyan font-black text-2xl mx-1 inline-block transform -rotate-2">30秒以内</span>に材料を入力すると<br className="hidden md:block"/>
             <span className="text-ink-magenta font-black text-2xl mx-1 inline-block transform rotate-1">AIシェフ</span>が料理してくれる！
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-5 md:gap-7 w-full pb-20 md:pb-4">
            {/* Waiting Status Card (Poster Style) */}
            <div className="relative group">
              {/* Tapes */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-6 tape z-20" />
              <div className="absolute bottom-4 -right-2 w-16 h-6 tape rotate-45 z-20" />

              <InkCard variant="glass" className="flex flex-col items-center justify-center gap-7 md:gap-8 py-9 md:py-12 border-4 border-white/10 bg-ink-base/40 backdrop-blur-md">
                <div className="text-center space-y-2 md:space-y-3">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md italic transform -rotate-1">WAITING...</h2>
                  <div className="inline-block bg-black text-ink-lime px-4 py-1 rounded-sm text-xs md:text-sm font-black border-2 border-ink-lime transform rotate-1 shadow-sm mb-[10px]">
                    ホストの開始を待っています
                  </div>
                </div>

                <div className="bg-white p-4 pb-6 md:pb-8 pt-5 md:pt-6 rounded-sm shadow-xl transform rotate-1 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 tape opacity-50" />
                  {shareUrl && (
                    <div className="flex justify-center">
                      <QRCode value={shareUrl} size={140} />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 font-bold"></div>
                </div>

                <div className="flex items-center gap-2.5 w-full max-w-xs relative mt-5 md:mt-6">
                  <div className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-black/50 rounded-xl border border-white/10 text-xs md:text-sm font-mono text-ink-cyan truncate select-all shadow-inner">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={handleCopyUrl}
                    className="bg-white text-ink-base hover:bg-gray-100 p-2.5 md:p-3 rounded-xl transition-colors focus:ring-2 focus:ring-ink-cyan border-4 border-black active:translate-y-[1px] shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
                    aria-label="URLをコピー"
                  >
                    {copied ? <ClipboardCheckIcon className="w-5 h-5 text-ink-base" /> : <ClipboardIcon className="w-5 h-5 text-ink-base" />}
                  </button>
                </div>
              </InkCard>
            </div>

            {/* Players List */}
            <div className={cardBaseClass}>
              <div className="flex items-center gap-3 mb-5 md:mb-6 border-b-4 border-dashed border-white/10 pb-3 md:pb-4">
                <User className="w-6 h-6 text-ink-magenta" />
                <h3 className="font-black text-white text-xl uppercase italic">Players</h3>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 md:gap-3">
                {room.players.map((p, i) => (
                  <li 
                    key={p.id} 
                    className="flex items-center gap-3 md:gap-4 bg-ink-base border-l-8 border-ink-surface p-3 md:p-3.5 rounded-r-xl shadow-sm hover:translate-x-1 transition-transform"
                    style={{ borderLeftColor: i === 0 ? 'var(--color-ink-yellow)' : 'var(--color-ink-surface)' }}
                  >
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-ink-base text-lg font-black border-2 border-black">
                      {p.nickname[0]}
                    </div>
                    <span className="font-bold text-white text-lg flex-1 truncate">{p.nickname}</span>
                    {room.players[0].id === p.id && (
                      <Crown className="w-6 h-6 text-ink-yellow drop-shadow-md shrink-0 animate-bounce-slight" aria-label="Host" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {isHost && (
            <div className="sticky top-[88px] w-full md:max-w-md z-40 md:mt-6">
              <InkButton
                onClick={handleStart}
                variant="accent"
                size="xl"
                className="w-full shadow-[0_0_26px_rgba(204,255,0,0.6)] text-[28px] font-black h-24 border-[5px] border-white/25 transform hover:scale-105 active:scale-95 transition-all"
              >
                ゲームスタート！
              </InkButton>
            </div>
          )}
        </main>
      )}

      {/* GAME PHASE */}
      {room.phase === 'COUNTDOWN' && (
        <main className={containerClass}>
          {/* Timer */}
          <div className="relative mb-8 transform transition-transform duration-300 hover:scale-105 group">
             <div className="absolute inset-0 bg-ink-magenta/20 blur-xl rounded-full group-hover:bg-ink-magenta/30 transition-colors" />
             <svg className="w-56 h-56 -rotate-90 filter drop-shadow-[0_0_15px_rgba(240,0,255,0.4)]" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="#0B1021" stroke="#1E293B" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="url(#timer-gradient)" strokeWidth="12"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * (timeLeft || 0)) / 30}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F000FF" />
                  <stop offset="100%" stopColor="#CCFF00" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-7xl font-black text-white font-mono drop-shadow-md tabular-nums transform -rotate-3 text-shadow-lg">{timeLeft}</span>
              <span className="text-sm font-black text-ink-magenta uppercase tracking-widest mt-2 bg-black px-2 py-0.5 transform rotate-2">SECONDS</span>
            </div>
          </div>

          <form onSubmit={handleSubmitIngredient} className="w-full space-y-2 relative">
             <div className="absolute -top-4 -left-2 w-16 h-6 tape -rotate-6 z-10" />
            
            <div className="bg-ink-surface p-4 pt-6 pb-6 rounded-3xl border-2 border-white/5 relative">
              <label htmlFor="ingredient-input" className={labelClass}>
                材料を入力
              </label>
              <div className="flex gap-4">
                <input
                  id="ingredient-input"
                  type="text"
                  value={ingredient}
                  onChange={(e) => setIngredient(e.target.value)}
                  placeholder="例: ドラゴンフルーツ"
                  className={inputClass}
                  maxLength={20}
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!ingredient.trim()}
                  className="aspect-square h-14 bg-ink-magenta hover:bg-ink-pink disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl flex items-center justify-center text-white transition-all shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 focus:ring-4 focus:ring-ink-magenta/30 outline-none border-4 border-black box-border"
                  aria-label="送信"
                >
                  <Send className="w-6 h-6 transform -rotate-12" />
                </button>
              </div>
            </div>
            <p className="text-center text-ink-cyan font-black text-lg mt-4 animate-pulse transform rotate-1">
              どんどん送信しよう！
            </p>
          </form>

          <div className={`${cardBaseClass} w-full min-h-[200px] mt-4`}>
             <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-dashed border-white/10">
                <h3 className="font-bold text-white text-lg uppercase tracking-wider flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-ink-lime animate-pulse shadow-[0_0_10px_#CCFF00]" />
                  みんなの材料
                </h3>
                <span className="font-mono text-2xl font-black text-ink-cyan transform -rotate-6 inline-block">{room.ingredients.length}</span>
             </div>
             <div className="flex flex-wrap gap-3">
                {room.ingredients.map((ing, i) => (
                  <span 
                    key={ing.id} 
                    className="bg-white text-black border-2 border-black px-4 py-2 rounded-sm font-black text-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)] animate-in zoom-in duration-300"
                    style={{ 
                      animationDelay: `${i * 50}ms`,
                      transform: `rotate(${Math.random() * 6 - 3}deg)`
                    }}
                  >
                    {ing.text}
                  </span>
                ))}
                {room.ingredients.length === 0 && (
                  <p className="text-gray-500 font-bold text-center w-full py-8 opacity-50">
                    まだ材料はありません...
                  </p>
                )}
             </div>
          </div>
        </main>
      )}

      {/* COOKING PHASE */}
      {room.phase === 'COOKING' && (
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="relative w-72 h-72 mb-12">
            <div className="absolute inset-0 bg-ink-magenta/10 blur-[80px] rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ChefHat className="w-36 h-36 text-ink-lime animate-bounce-slight drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]" />
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-ink-cyan to-blue-500 rounded-full animate-float opacity-80" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-br from-ink-pink to-red-500 rounded-full animate-float opacity-80" style={{ animationDelay: '1.2s' }} />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black text-white italic mb-6 text-shadow-lg tracking-tight transform -rotate-2">
            COOKING...
          </h2>
          <div className="inline-block bg-ink-surface/80 backdrop-blur px-8 py-3 rounded-full border border-white/10">
            <p className="text-xl text-ink-cyan font-bold tracking-widest animate-pulse">
              AIシェフが調理中！
            </p>
          </div>
        </main>
      )}

      {/* RESULT PHASE */}
      {room.phase === 'RESULT' && room.result && (
        <main className={containerClass}>
           {/* Header Section */}
           <div className="text-center w-full mb-4">
             <div className="inline-block bg-ink-magenta text-white px-9 py-3 rounded-full text-2xl font-black italic transform -rotate-1 border-[5px] border-black shadow-[0_10px_0_rgba(0,0,0,0.45)] mb-6 tracking-widest drop-shadow-lg">
               DISH COMPLETE!
             </div>
              <h2 className="text-3xl md:text-4xl font-black text-white bg-ink-surface px-8 py-6 rounded-3xl border-4 border-white/5 shadow-xl leading-tight break-words relative overflow-hidden">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-ink-magenta/20 rounded-full blur-xl" />
                {room.result.dishName}
              </h2>
           </div>

           {/* Image Section */}
           <div className="w-full relative group">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-8 tape z-20 opacity-80" />
             <div className="absolute inset-0 bg-gradient-to-tr from-ink-magenta via-transparent to-ink-cyan opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
             <InkCard variant="neon" className="p-2 bg-white border-4 border-white transform rotate-1 transition-transform group-hover:rotate-0 duration-500 shadow-2xl">
                <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-gray-200">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={room.result.imageUrl} 
                    alt={room.result.dishName}
                    className="w-full h-full object-cover"
                  />
                </div>
             </InkCard>
           </div>

           {/* Description Section */}
           <div className="w-full bg-ink-surface p-8 rounded-3xl border-l-[12px] border-ink-cyan shadow-md relative">
             <div className="absolute -top-3 right-8 w-16 h-8 tape rotate-3 opacity-50" />
             <p className="text-lg font-bold text-white leading-loose tracking-wide">
               {room.result.description}
             </p>
           </div>

           {/* Ingredients Section */}
           <div className="w-full mb-8">
             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-3 pl-2">
               <div className="w-4 h-8 bg-ink-lime skew-x-12 rounded-sm" />
               USED INGREDIENTS
             </h3>
             <div className="flex flex-wrap gap-3">
                {room.ingredients.map((ing, i) => {
                  const tilt = i % 3 === 0 ? '-rotate-1' : i % 3 === 1 ? 'rotate-1' : 'rotate-2';
                  return (
                    <div key={ing.id} className={`relative ${tilt}`}>
                      <div className="absolute -top-1 left-4 w-10 h-2 bg-amber-200/80 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.25)] rotate-2" />
                      <div className="bg-white text-ink-base border-4 border-black px-5 py-3 rounded-xl font-black text-base shadow-[4px_4px_0_rgba(0,0,0,0.4)] min-w-[170px] flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-ink-cyan text-ink-base rounded-full border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.35)] text-sm">
                          {i + 1}
                        </span>
                        <span className="leading-tight text-ink-magenta font-black">{ing.text}</span>
                      </div>
                    </div>
                  );
                })}
             </div>
           </div>

           {/* Action Button */}
           <div className="w-full sticky bottom-6 z-40">
             <InkButton 
                onClick={() => router.push('/')}
                variant="primary"
                size="lg"
                className="w-full h-20 font-black text-2xl shadow-[0_8px_0_#000] border-4 border-white/20 active:translate-y-2 active:shadow-[0_0px_0_#000]"
             >
                <RefreshCw className="mr-3 w-8 h-8" />
                もう一度遊ぶ
             </InkButton>
           </div>
        </main>
      )}
    </InkLayout>
  );
}
