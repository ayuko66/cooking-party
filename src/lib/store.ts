
export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'COOKING' | 'RESULT';

export interface Player {
  id: string;
  nickname: string;
}

export interface Ingredient {
  id: string;
  playerId: string;
  text: string;
}

export interface CookingResult {
  dishName: string;
  description: string;
  imageUrl: string;
}

export interface Room {
  id: string;
  phase: GamePhase;
  players: Player[];
  ingredients: Ingredient[];
  countdownEndTime?: number; // タイムスタンプ
  result?: CookingResult;
  createdAt: number;
}

// インメモリデータストア
class GameStore {
  private rooms: Map<string, Room> = new Map();

  createRoom(): string {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.rooms.set(roomId, {
      id: roomId,
      phase: 'LOBBY',
      players: [],
      ingredients: [],
      createdAt: Date.now(),
    });
    return roomId;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, nickname: string): Player | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.phase !== 'LOBBY') return null; // ロビーでのみ参加可能
    if (room.players.length >= 5) return null; // 最大5人まで

    const player: Player = {
      id: Math.random().toString(36).substring(2, 10),
      nickname,
    };
    room.players.push(player);
    return player;
  }

  startGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.phase === 'LOBBY') {
      room.phase = 'COUNTDOWN';
      room.countdownEndTime = Date.now() + 30 * 1000; // 30秒
    }
  }

  addIngredient(roomId: string, playerId: string, text: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.phase !== 'COUNTDOWN') return false;
    if (room.ingredients.length >= 20) return false;
    if (text.length > 10) return false;

    room.ingredients.push({
      id: Math.random().toString(36).substring(2, 10),
      playerId,
      text,
    });
    return true;
  }

  setCookingPhase(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.phase = 'COOKING';
    }
  }

  setResult(roomId: string, result: CookingResult) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.result = result;
      room.phase = 'RESULT';
    }
  }
}

// 開発用グローバルインスタンス（ホットリロード時に状態を保持）
const globalForStore = global as unknown as { gameStore: GameStore };
export const store = globalForStore.gameStore || new GameStore();
if (process.env.NODE_ENV !== 'production') globalForStore.gameStore = store;
