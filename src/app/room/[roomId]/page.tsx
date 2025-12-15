'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChefHat, Send, Users, User, Copy, Check, RefreshCw, Sparkles, Clock, Crown } from 'lucide-react';
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

  useEffect(() => {
    if (!player) return;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/rooms/state?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setRoom(data);
        } else {
          if (res.status === 404) {
            alert('部屋が見つかりません');
            router.push('/');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [roomId, player, router]);

  useEffect(() => {
    if (room?.phase === 'COUNTDOWN' && room.countdownEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((room.countdownEndTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
      };
      updateTimer();
      const timer = setInterval(updateTimer, 100);
      return () => clearInterval(timer);
    }
  }, [room?.phase, room?.countdownEndTime]);

  useEffect(() => {
    if (timeLeft === 0 && room?.phase === 'COUNTDOWN' && room.players[0].id === player?.id) {
       fetch('/api/rooms/cook', {
         method: 'POST',
         body: JSON.stringify({ roomId, isDev }),
       });
    }
  }, [timeLeft, room?.phase, room?.players, player?.id, roomId]);


  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomId, nickname }),
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
      body: JSON.stringify({ roomId }),
    });
  };

  const handleSubmitIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient.trim() || !player) return;

    const res = await fetch('/api/rooms/submit', {
      method: 'POST',
      body: JSON.stringify({ roomId, playerId: player.id, text: ingredient }),
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
    "h-[33.5px] md:h-[40px] px-4 md:px-5 text-base md:text-lg tracking-widest",
    "backdrop-blur-sm border-2 md:border-3",
    "bg-white/60 text-ink-base border-ink-cyan/70 focus:border-ink-cyan placeholder:text-ink-base/50",
    "focus:outline-none focus:ring-2 focus:ring-ink-cyan/40 focus:ring-offset-2 focus:ring-offset-ink-base"
  );
  const cardBaseClass = "bg-ink-surface border-2 border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden";

  // --- JOIN SCREEN ---
  if (!player) {
    return (
      <InkLayout className="items-center justify-center p-4">
        <InkCard variant="neon" className="w-full max-w-md p-0 overflow-hidden shadow-2xl transform rotate-1" decoration="splat">
          <div className="bg-ink-base/80 p-6 md:p-8 space-y-8 backdrop-blur-sm relative">
            {/* Top Tape */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 tape" />

            <div className="text-center space-y-6 relative">
              <h1 className="text-5xl font-black text-white italic transform -rotate-3 text-shadow-lg leading-tight">
                JOIN<br/><span className="text-ink-cyan">ROOM</span>
              </h1>
              <div className="relative inline-block group cursor-default">
                <div className="absolute -inset-2 bg-ink-magenta blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative px-8 py-3 bg-white text-ink-base font-black text-4xl rotate-2 rounded-sm border-4 border-black box-shadow-sticker group-hover:box-shadow-sticker-hover transition-all">
                  {roomId}
                </div>
                {/* ID Tape */}
                <div className="absolute -top-3 -right-4 w-12 h-6 tape rotate-45 opacity-80" />
                <div className="absolute -bottom-2 -left-3 w-10 h-6 tape -rotate-12 opacity-80" />
              </div>
            </div>
            
            <form onSubmit={handleJoin} className="space-y-6 pt-4">
              <div className="space-y-1">
                <label htmlFor="nickname" className={labelClass}>Nickname</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={inputClass}
                  placeholder="イカした名前"
                  maxLength={10}
                />
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
                className="w-full h-16 text-2xl font-black shadow-lg transform active:scale-95 transition-transform"
              >
                {nickname.trim() ? '参加する！' : '名前を入力してね'}
              </InkButton>
            </form>
          </div>
        </InkCard>
      </InkLayout>
    );
  }

  if (!room) return (
    <InkLayout className="items-center justify-center">
      <div className="text-4xl font-black text-white animate-bounce drop-shadow-lg" role="status">
        LOADING...
      </div>
    </InkLayout>
  );

  const isHost = room.players[0]?.id === player.id;

  return (
    <InkLayout>
      {/* HEADER */}
      <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center bg-ink-base/90 backdrop-blur-md p-2 pl-4 pr-2 rounded-full border-2 border-white/20 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-ink-magenta to-ink-purple p-2.5 rounded-full shadow-inner border-2 border-white/10">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] font-bold text-ink-cyan uppercase tracking-widest mb-1">Room ID</div>
              <div className="text-2xl font-black text-white font-mono tracking-tighter">{roomId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-ink-surface px-5 py-2.5 rounded-full border-2 border-ink-lime/30 shadow-inner">
            <Users className="w-5 h-5 text-ink-lime" />
            <span className="text-xl font-bold text-white tabular-nums">{room.players.length}</span>
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
                  <div className="inline-block bg-ink-lime text-black px-4 py-1 rounded-sm text-xs md:text-sm font-black border-2 border-black transform rotate-1 shadow-sm">
                    ホストの開始を待っています
                  </div>
                </div>

                <div className="bg-white p-4 pb-6 md:pb-8 pt-5 md:pt-6 rounded-sm shadow-xl transform rotate-1 border-4 border-gray-200 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 tape opacity-50" />
                  {shareUrl && <QRCode value={shareUrl} size={140} />}
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 font-bold">SCAN ME</div>
                </div>

                <div className="flex items-center gap-2 w-full max-w-xs relative">
                  <div className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-black/50 rounded-xl border border-white/10 text-[11px] md:text-xs font-mono text-ink-cyan truncate select-all shadow-inner">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={handleCopyUrl}
                    className="bg-ink-surface hover:bg-ink-surface/80 p-2.5 md:p-3 rounded-xl text-white transition-colors focus:ring-2 focus:ring-ink-cyan border-2 border-white/5 active:scale-95"
                    aria-label="URLをコピー"
                  >
                    {copied ? <Check className="w-5 h-5 text-ink-lime" /> : <Copy className="w-5 h-5" />}
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
            <div className="fixed bottom-6 left-4 right-4 md:static md:w-full md:max-w-md z-40">
              <InkButton
                onClick={handleStart}
                variant="accent"
                size="xl"
                className="w-full shadow-[0_0_20px_rgba(204,255,0,0.5)] text-2xl font-black h-20 border-4 border-white/20 transform hover:scale-105 active:scale-95 transition-all"
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
                  className={`${inputClass} text-xl h-[33.5px] md:h-[40px] px-4 md:px-5`}
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
              <div className="inline-block bg-ink-lime text-black px-8 py-2 rounded-full text-xl font-black italic transform -rotate-1 border-4 border-black shadow-[4px_4px_0_black] mb-6">
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
             <div className="absolute bottom-6 right-6 z-20">
                <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-sm border-l-4 border-ink-magenta flex items-center gap-2 shadow-lg transform -rotate-1">
                  <Sparkles className="w-4 h-4 text-ink-magenta" />
                  <span className="text-white text-xs font-bold tracking-wider">AI GENERATED</span>
                </div>
             </div>
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
                {room.ingredients.map((ing) => (
                  <span key={ing.id} className="bg-ink-base text-gray-200 border-2 border-ink-surface px-5 py-3 rounded-xl font-bold text-base shadow-sm">
                    {ing.text}
                  </span>
                ))}
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
