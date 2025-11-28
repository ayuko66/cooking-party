'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowRight, Plus } from 'lucide-react';

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
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-orange-500 p-8 text-center">
          <div className="mx-auto bg-white w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <ChefHat className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cooking Party</h1>
          <p className="text-orange-100">みんなで食材を持ち寄って<br/>AIシェフに料理を作ってもらおう！</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Join Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              部屋IDを入力して参加
            </label>
            <form onSubmit={joinRoom} className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ABCD"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none uppercase"
                maxLength={4}
              />
              <button
                type="submit"
                disabled={!roomId.trim()}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          {/* Create Room */}
          <button
            onClick={createRoom}
            disabled={isCreating}
            className="w-full bg-orange-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <span className="animate-pulse">作成中...</span>
            ) : (
              <>
                <Plus className="w-6 h-6" />
                新しい部屋を作る
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
