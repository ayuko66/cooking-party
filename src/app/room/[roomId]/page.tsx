'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChefHat, Timer, Send, Users, Sparkles, RefreshCw, User, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Room, Player, GamePhase } from '@/lib/store';

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

  // 部屋の状態をポーリング
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

  // カウントダウンタイマーのロジック
  useEffect(() => {
    if (room?.phase === 'COUNTDOWN' && room.countdownEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((room.countdownEndTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0 && player) {
           // ホストなら調理を開始するか？それともサーバーを待つか？
           // サーバーは自動遷移しない。クライアントがトリガーするか、サーバーにトリガーが必要。
           // MVPでは、タイマー終了時にホストが自動的に'cook'をトリガーする？
           // またはシンプルに：サーバーのstateエンドポイントが時間を確認して遷移する？
           // しかし、バックグラウンドジョブなしのインメモリストアを使用している。
           // そのため、ホストに遷移をトリガーさせる。
        }
      };
      updateTimer();
      const timer = setInterval(updateTimer, 100);
      return () => clearInterval(timer);
    }
  }, [room?.phase, room?.countdownEndTime, player]);

  // 時間切れ時にホストが自動的に調理をトリガー
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
        // 必要ならセッションを永続化するが、今のところはstateのみ
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

  // --- 画面表示 ---

  if (!player) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">部屋に参加: {roomId}</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="例: たなか"
                maxLength={10}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              参加する
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!room) return <div className="min-h-screen bg-orange-50 flex items-center justify-center">Loading...</div>;

  const isHost = room.players[0]?.id === player.id;

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden min-h-[80vh] flex flex-col">
        
        {/* ヘッダー */}
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            <span className="font-bold text-lg">Room: {roomId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            <span>{room.players.length}人</span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-6 flex flex-col">
          
          {/* ロビー */}
          {room.phase === 'LOBBY' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <div className="bg-orange-100 p-4 rounded-xl text-center max-w-md mx-auto w-full">
                <p className="text-orange-800 font-bold">
                  みんなで、30秒以内に材料を入力すると<br />AIが料理してくれる
                </p>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">メンバー待機中...</h2>
                <p className="text-gray-500">ホストが開始するのを待っています</p>
                <p className="text-sm text-orange-600 font-bold bg-orange-100 px-3 py-1 rounded-full inline-block">
                  1〜5名まで参加OK
                </p>
              </div>

              {/* QRコードとURL */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  {shareUrl && <QRCode value={shareUrl} size={128} />}
                </div>
                <div className="w-full max-w-xs">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input 
                      type="text" 
                      value={shareUrl} 
                      readOnly 
                      className="bg-transparent flex-1 text-xs text-gray-500 outline-none"
                    />
                    <button 
                      onClick={handleCopyUrl}
                      className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-600"
                      title="URLをコピー"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm bg-orange-50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">参加者リスト</h3>
                <ul className="space-y-2">
                  {room.players.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{p.nickname}</span>
                      {room.players[0].id === p.id && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">HOST</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {isHost && (
                <button
                  onClick={handleStart}
                  className="w-full max-w-xs bg-green-500 text-white py-4 rounded-xl font-bold text-xl hover:bg-green-600 transition-all shadow-lg transform hover:scale-105"
                >
                  ゲームスタート！
                </button>
              )}
            </div>
          )}

          {/* カウントダウン / 入力 */}
          {room.phase === 'COUNTDOWN' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-8">
                <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#fed7aa"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="8"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * (timeLeft || 0)) / 20}
                      className="transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-4xl font-black text-orange-500 font-mono relative z-10">
                    {timeLeft}
                  </div>
                </div>
                <p className="text-gray-600 font-bold animate-pulse">材料を入力して送信！</p>
              </div>

              <div className="flex-1 space-y-4">
                <form onSubmit={handleSubmitIngredient} className="flex gap-2">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => setIngredient(e.target.value)}
                    placeholder="材料 (例: ドラゴンの肉)"
                    className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 outline-none text-lg"
                    maxLength={10}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!ingredient.trim()}
                    className="bg-orange-500 text-white px-6 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>

                <div className="bg-gray-50 rounded-xl p-4 h-64 overflow-y-auto">
                  <h3 className="text-sm font-bold text-gray-500 mb-2">投稿された材料 ({room.ingredients.length}/20)</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.ingredients.map((ing) => (
                      <span key={ing.id} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm shadow-sm animate-in fade-in zoom-in duration-300">
                        {ing.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 調理中 */}
          {room.phase === 'COOKING' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-20"></div>
                <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center relative z-10">
                  <ChefHat className="w-16 h-16 text-orange-500 animate-bounce" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">AIシェフが調理中...</h2>
                <p className="text-gray-500">最高の一皿を仕上げています</p>
              </div>
            </div>
          )}

          {/* 結果 */}
          {room.phase === 'RESULT' && room.result && (
            <div className="flex-1 flex flex-col space-y-6 animate-in slide-in-from-bottom duration-700">
              <div className="text-center">
                <div className="inline-block bg-orange-100 text-orange-800 px-4 py-1 rounded-full text-sm font-bold mb-4">
                  完成しました！
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">
                  {room.result.dishName}
                </h2>
              </div>

              <div className="aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden shadow-lg relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={room.result.imageUrl} 
                  alt={room.result.dishName}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                <p className="text-gray-700 leading-relaxed font-medium">
                  {room.result.description}
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-bold text-gray-500 mb-3">使われた材料</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  {room.ingredients.map((ing) => (
                    <span key={ing.id} className="bg-gray-100 px-2 py-1 rounded">
                      {ing.text}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                もう一度遊ぶ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
