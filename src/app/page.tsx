'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { InkLayout } from '@/components/ui/ink-layout';
import { InkButton } from '@/components/ui/ink-button';
import { InkCard } from '@/components/ui/ink-card';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms/create', { method: 'POST' });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/room/${data.roomId}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsCreating(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim().toUpperCase()}`);
    }
  };

  return (
    <InkLayout className="items-center justify-center">
      <div className="w-full max-w-lg flex flex-col gap-10 relative z-10">
        
        {/* LOGO */}
        <div className="text-center space-y-4">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-ink-magenta blur-[50px] opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative w-32 h-32 bg-ink-base rounded-full flex items-center justify-center mx-auto border-[6px] border-ink-magenta shadow-[0_0_0_4px_rgba(240,0,255,0.3)] transform group-hover:scale-105 transition-transform duration-300 rotate-3">
              <ChefHat className="w-16 h-16 text-ink-lime drop-shadow-md" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-ink-cyan text-ink-base text-xs font-black px-2 py-1 rounded-lg rotate-12 border-2 border-white">
              BETA
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-6xl font-black text-white italic tracking-tighter text-shadow-lg transform -rotate-2">
              Cooking <span className="text-ink-lime">Party</span>
            </h1>
            <p className="text-gray-300 font-bold text-lg max-w-xs mx-auto leading-tight">
              食材を持ち寄って <span className="text-ink-pink">AIシェフ</span> に<br/>料理を作ってもらおう！
            </p>
          </div>
        </div>

        {/* ACTIONS CARD */}
        <InkCard variant="glass" className="space-y-8 p-8" decoration="splat">
          
          <div className="space-y-4">
            <label className="block text-sm font-black text-ink-cyan uppercase tracking-widest pl-2">
              Join Room
            </label>
            <form onSubmit={joinRoom} className="flex gap-3">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ROOM ID"
                className="flex-1 bg-ink-base text-white px-6 py-4 rounded-2xl border-4 border-ink-surface focus:border-ink-cyan focus:outline-none transition-all font-mono text-2xl uppercase placeholder-gray-700 font-bold"
                maxLength={4}
              />
              <button
                type="submit"
                disabled={!roomId.trim()}
                className="bg-ink-cyan text-ink-base p-4 rounded-2xl font-black hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                <ArrowRight className="w-8 h-8" />
              </button>
            </form>
          </div>

          <div className="relative flex items-center my-4">
            <div className="flex-1 border-t-2 border-white/5"></div>
            <span className="px-4 text-gray-500 font-black text-xs uppercase">OR</span>
            <div className="flex-1 border-t-2 border-white/5"></div>
          </div>

          <InkButton
            onClick={createRoom}
            isLoading={isCreating}
            variant="primary"
            size="lg"
            className="w-full py-5 text-xl shadow-[0_4px_0_#b000ba]"
          >
            <Plus className="mr-2" />
            新しい部屋を作る
          </InkButton>

        </InkCard>

        {/* FOOTER */}
        <div className="flex justify-center gap-6 text-white/30 font-bold text-sm">
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span>AI POWERED</span>
          </div>
          <span>•</span>
          <span>v0.1.0</span>
        </div>

      </div>
    </InkLayout>
  );
}
