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

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = decodeURIComponent(params.roomId as string).toUpperCase();

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
         body: JSON.stringify({ roomId }),
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

  // --- JOIN SCREEN ---
  if (!player) {
    return (
      <InkLayout className="items-center justify-center">
        <InkCard variant="neon" className="w-full max-w-md p-0 overflow-hidden" decoration="splat">
          <div className="bg-ink-base/50 p-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-white italic transform -rotate-2">JOIN ROOM</h1>
              <div className="inline-block px-6 py-2 bg-ink-cyan text-ink-base font-black text-2xl rotate-2 rounded-sm shadow-lg">
                ID: {roomId}
              </div>
            </div>
            
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-ink-magenta uppercase tracking-wider">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-4 bg-ink-base border-4 border-ink-surface rounded-xl focus:border-ink-pink focus:outline-none text-white font-bold placeholder-gray-600 transition-all text-lg"
                  placeholder="例: イカした名前"
                  maxLength={10}
                />
              </div>
              {error && (
                <div className="text-white text-sm font-bold bg-red-500/80 p-3 rounded-lg animate-bounce-slight text-center border-2 border-red-500">
                  {error}
                </div>
              )}
              <InkButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={!nickname.trim()}
                className="w-full text-xl"
              >
                参加する！
              </InkButton>
            </form>
          </div>
        </InkCard>
      </InkLayout>
    );
  }

  if (!room) return (
    <InkLayout className="items-center justify-center">
      <div className="text-4xl font-black text-white animate-bounce text-stroke-2 text-stroke-black">
        LOADING...
      </div>
    </InkLayout>
  );

  const isHost = room.players[0]?.id === player.id;

  return (
    <InkLayout>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-ink-surface/60 backdrop-blur-md p-4 rounded-full border-2 border-white/5 shadow-xl sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-ink-magenta p-2 rounded-full shadow-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold text-ink-cyan uppercase tracking-widest">Room ID</div>
            <div className="text-xl font-black text-white font-mono tracking-tighter">{roomId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-ink-base/80 px-4 py-2 rounded-full border border-white/10">
          <Users className="w-4 h-4 text-ink-lime" />
          <span className="text-lg font-bold text-white">{room.players.length}</span>
        </div>
      </div>

      {/* LOBBY PHASE */}
      {room.phase === 'LOBBY' && (
        <div className="flex-1 flex flex-col items-center gap-8">
          
          <div className="w-full bg-ink-cyan/10 border-2 border-ink-cyan/30 p-4 rounded-2xl text-center backdrop-blur-sm animate-pulse">
            <p className="text-xl font-black text-white text-shadow-sm">
             みんなで、<span className="text-ink-cyan text-2xl">30秒以内</span>に材料を入力すると<br/>
             <span className="text-ink-magenta text-2xl">AIシェフ</span>が料理してくれる！
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full">
            <InkCard variant="glass" className="flex flex-col items-center justify-center gap-6 py-10">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-2">WAITING...</h2>
                <div className="text-sm font-bold text-ink-lime bg-ink-base/50 px-3 py-1 rounded-full inline-block">
                  ホストの開始を待っています
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xl transform rotate-2 border-4 border-ink-base">
                {shareUrl && <QRCode value={shareUrl} size={150} />}
              </div>

              <div className="flex items-center gap-2 w-full max-w-xs">
                <div className="flex-1 bg-ink-base/80 px-3 py-2 rounded-lg border border-white/10 text-xs font-mono text-gray-400 truncate">
                  {shareUrl}
                </div>
                <button 
                  onClick={handleCopyUrl}
                  className="bg-ink-surface p-2 rounded-lg hover:bg-ink-surface/80 text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-ink-lime" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </InkCard>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <User className="w-5 h-5 text-ink-magenta" />
                <h3 className="font-black text-white text-lg uppercase italic">Players</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {room.players.map((p, i) => (
                  <div 
                    key={p.id} 
                    className="flex items-center gap-4 bg-ink-surface border-2 border-ink-base/50 p-3 rounded-2xl shadow-lg transform hover:-translate-y-1 transition-transform"
                    style={{ transform: `rotate(${i % 2 === 0 ? '1deg' : '-1deg'})` }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-tr from-ink-purple to-ink-magenta rounded-full flex items-center justify-center text-white font-bold border-2 border-white/20">
                      {p.nickname[0]}
                    </div>
                    <span className="font-black text-white text-lg flex-1">{p.nickname}</span>
                    {room.players[0].id === p.id && (
                      <Crown className="w-6 h-6 text-ink-yellow drop-shadow-md" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isHost && (
            <div className="fixed bottom-8 left-0 right-0 px-4 md:relative md:bottom-auto">
              <InkButton
                onClick={handleStart}
                variant="accent"
                size="xl"
                className="w-full max-w-md mx-auto shadow-[0_0_30px_rgba(204,255,0,0.4)] animate-bounce-slight"
              >
                ゲームスタート！
              </InkButton>
            </div>
          )}
        </div>
      )}

      {/* GAME PHASE */}
      {room.phase === 'COUNTDOWN' && (
        <div className="flex-1 flex flex-col items-center w-full max-w-2xl mx-auto">
          {/* Timer */}
          <div className="relative mb-12 transform hover:scale-105 transition-transform duration-300">
             <svg className="w-48 h-48 -rotate-90 drop-shadow-[0_0_15px_rgba(240,0,255,0.5)]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#0B1021" strokeWidth="12" />
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
              <span className="text-6xl font-black text-white font-mono drop-shadow-md">{timeLeft}</span>
              <span className="text-xs font-bold text-ink-magenta uppercase tracking-widest mt-1">SECONDS</span>
            </div>
          </div>

          <form onSubmit={handleSubmitIngredient} className="w-full space-y-4 mb-8">
            <div className="relative">
              <input
                type="text"
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
                placeholder="材料を入力 (例: ドラゴンフルーツ)"
                className="w-full px-6 py-5 bg-ink-base border-4 border-ink-surface rounded-3xl focus:border-ink-cyan outline-none text-2xl font-bold text-white placeholder-gray-700 transition-all shadow-inner"
                maxLength={20}
                autoFocus
              />
              <button
                type="submit"
                disabled={!ingredient.trim()}
                className="absolute right-3 top-3 bottom-3 aspect-square bg-ink-magenta rounded-2xl flex items-center justify-center text-white hover:bg-ink-pink disabled:opacity-50 disabled:hover:bg-ink-magenta transition-colors shadow-lg"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
            <p className="text-center text-ink-cyan font-bold text-sm animate-pulse">
              どんどん送信しよう！
            </p>
          </form>

          <div className="w-full bg-ink-surface/50 rounded-3xl p-6 border-2 border-white/5 min-h-[200px]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ink-lime animate-pulse" />
                  みんなの材料
                </h3>
                <span className="font-mono text-ink-cyan">{room.ingredients.length}</span>
             </div>
             <div className="flex flex-wrap gap-3">
                {room.ingredients.map((ing, i) => (
                  <span 
                    key={ing.id} 
                    className="bg-ink-base border-2 border-ink-surface text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md animate-in zoom-in duration-300"
                    style={{ 
                      animationDelay: `${i * 50}ms`,
                      transform: `rotate(${Math.random() * 6 - 3}deg)`
                    }}
                  >
                    {ing.text}
                  </span>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* COOKING PHASE */}
      {room.phase === 'COOKING' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative w-64 h-64 mb-12">
            <div className="absolute inset-0 bg-ink-magenta/20 blur-[60px] rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ChefHat className="w-32 h-32 text-ink-lime animate-bounce-slight drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]" />
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-ink-cyan rounded-full animate-float [animation-delay:0.5s]" />
            <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-ink-pink rounded-full animate-float [animation-delay:1.2s]" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white italic mb-4 text-shadow-lg">
            COOKING...
          </h2>
          <p className="text-xl text-ink-cyan font-bold tracking-widest animate-pulse">
            AIシェフが調理中！
          </p>
        </div>
      )}

      {/* RESULT PHASE */}
      {room.phase === 'RESULT' && room.result && (
        <div className="flex-1 w-full max-w-md mx-auto animate-in slide-in-from-bottom duration-700 pb-8">
           {/* Header Section */}
           <div className="text-center mb-8 relative space-y-4">
              <div className="inline-block bg-ink-lime text-black px-6 py-2 rounded-full text-lg font-black italic transform -rotate-2 border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                DISH COMPLETE!
              </div>
              <h2 className="text-3xl font-black text-white bg-ink-surface px-6 py-4 rounded-2xl border-2 border-white/10 shadow-lg leading-tight break-words">
                {room.result.dishName}
              </h2>
           </div>

           {/* Image Section */}
           <div className="mb-8">
             <InkCard variant="neon" className="p-1 mb-2 bg-ink-base border-ink-magenta transform rotate-1">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={room.result.imageUrl} 
                    alt={room.result.dishName}
                    className="w-full h-full object-cover"
                  />
                </div>
             </InkCard>
             <div className="flex justify-end px-2">
                <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-ink-magenta/50 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ink-magenta" />
                  <span className="text-white text-xs font-bold tracking-wider">AI GENERATED</span>
                </div>
             </div>
           </div>

           {/* Description Section */}
           <div className="bg-ink-surface p-6 rounded-3xl border-l-8 border-ink-cyan mb-8 shadow-md">
             <p className="text-base font-bold text-white leading-relaxed">
               {room.result.description}
             </p>
           </div>

           {/* Ingredients Section */}
           <div className="mb-12">
             <h3 className="text-white font-black text-lg mb-4 flex items-center gap-3">
               <div className="w-3 h-8 bg-ink-lime skew-x-12 rounded-sm" />
               USED INGREDIENTS
             </h3>
             <div className="flex flex-wrap gap-2">
                {room.ingredients.map((ing) => (
                  <span key={ing.id} className="bg-ink-base text-white border-2 border-ink-surface px-4 py-3 rounded-xl font-bold text-base shadow-sm">
                    {ing.text}
                  </span>
                ))}
             </div>
           </div>

           {/* Action Button */}
           <InkButton 
              onClick={() => router.push('/')}
              variant="primary"
              size="lg"
              className="w-full h-14 font-black text-xl shadow-[0_4px_0_#000] active:shadow-none active:translate-y-1 transition-all"
           >
              <RefreshCw className="mr-3 w-6 h-6" />
              もう一度遊ぶ
           </InkButton>
        </div>
      )}
    </InkLayout>
  );
}
