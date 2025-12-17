
export class KvUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? 'KV unavailable');
    this.name = 'KvUnavailableError';
  }
}

// KV client is loaded lazily to avoid hard dependency during local/dev when env vars are missing
let kvClient: any = null;
const getKvClient = async () => {
  if (kvClient) return kvClient;
  try {
    const mod = await import('@vercel/kv');
    kvClient = mod.kv;
    return kvClient;
  } catch (err) {
    console.warn('KV client unavailable.', err);
    throw new KvUnavailableError('Failed to load KV client');
  }
};

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
  updatedAt: number;
  version: number;
}

const DEFAULT_ROOM_TTL_SECONDS = 21600;
const parsedTtl = parseInt(process.env.ROOM_TTL_SECONDS ?? `${DEFAULT_ROOM_TTL_SECONDS}`, 10);
const ROOM_TTL_SECONDS =
  Number.isFinite(parsedTtl) && parsedTtl > 60 ? parsedTtl : DEFAULT_ROOM_TTL_SECONDS; // guard against accidental tiny TTL
const isKvEnvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export const getStoreMode = (): 'kv' | 'memory' => (isKvEnvConfigured ? 'kv' : 'memory');
export const getStoreDebug = () => ({
  isKvEnvConfigured,
  kvUrlPresent: Boolean(process.env.KV_REST_API_URL),
  kvTokenPresent: Boolean(process.env.KV_REST_API_TOKEN),
  storeMode: getStoreMode(),
});

type StoreAdapter = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: any, opts?: { ex?: number }) => Promise<void>;
};

const memoryStore = (() => {
  const map = new Map<string, { value: any; expiresAt: number | null }>();
  return {
    get: async <T>(key: string): Promise<T | null> => {
      const entry = map.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        map.delete(key);
        return null;
      }
      return entry.value as T;
    },
    set: async (key: string, value: any, opts?: { ex?: number }) => {
      const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null;
      map.set(key, { value, expiresAt });
    },
  };
})();

const adapter: StoreAdapter = isKvEnvConfigured
  ? {
      get: async <T>(key: string) => {
        try {
          const kv = await getKvClient();
          const value = await kv.get(key);
          return (value as T) ?? null;
        } catch (err) {
          if (err instanceof KvUnavailableError) throw err;
          console.error('KV get error', err);
          throw new KvUnavailableError('KV get failed');
        }
      },
      set: async (key: string, value: any, opts?: { ex?: number }) => {
        try {
          const kv = await getKvClient();
          await kv.set(key, value, { ex: opts?.ex });
        } catch (err) {
          if (err instanceof KvUnavailableError) throw err;
          console.error('KV set error', err);
          throw new KvUnavailableError('KV set failed');
        }
      },
    }
  : memoryStore;

const roomKey = (roomId: string) => `room:${roomId}`;

async function saveRoom(room: Room) {
  await adapter.set(roomKey(room.id), room, { ex: ROOM_TTL_SECONDS });
  return room;
}

export async function createRoom(): Promise<string> {
  const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const now = Date.now();
  const room: Room = {
    id: roomId,
    phase: 'LOBBY',
    players: [],
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await saveRoom(room);
  return roomId;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const room = await adapter.get<Room>(roomKey(roomId));
  return room ?? null;
}

async function updateRoom(
  roomId: string,
  updater: (room: Room) => Room | null
): Promise<Room | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const next = updater({ ...room, players: [...room.players], ingredients: [...room.ingredients] });
  if (!next) {
    // No state change, but refresh TTL
    await adapter.set(roomKey(roomId), room, { ex: ROOM_TTL_SECONDS });
    return room;
  }
  next.version = (room.version ?? 0) + 1;
  next.updatedAt = Date.now();
  return saveRoom(next);
}

export async function joinRoom(roomId: string, nickname: string): Promise<Player | null> {
  let joined: Player | null = null;
  await updateRoom(roomId, (room) => {
    if (room.phase !== 'LOBBY') return null;
    if (room.players.length >= 5) return null;
    const player: Player = {
      id: Math.random().toString(36).substring(2, 10),
      nickname,
    };
    joined = player;
    return { ...room, players: [...room.players, player] };
  });
  return joined;
}

export async function startGame(roomId: string) {
  await updateRoom(roomId, (room) => {
    if (room.phase !== 'LOBBY') return null;
    return {
      ...room,
      phase: 'COUNTDOWN',
      countdownEndTime: Date.now() + 30 * 1000,
    };
  });
}

export async function addIngredient(roomId: string, playerId: string, text: string): Promise<boolean> {
  let added = false;
  await updateRoom(roomId, (room) => {
    if (room.phase !== 'COUNTDOWN') return null;
    if (room.ingredients.length >= 20) return null;
    if (text.length > 10) return null;

    added = true;
    return {
      ...room,
      ingredients: [
        ...room.ingredients,
        {
          id: Math.random().toString(36).substring(2, 10),
          playerId,
          text,
        },
      ],
    };
  });
  return added;
}

export async function setCookingPhase(roomId: string) {
  await updateRoom(roomId, (room) => {
    if (room.phase === 'COOKING' || room.phase === 'RESULT') return null;
    return { ...room, phase: 'COOKING' };
  });
}

export async function setResult(roomId: string, result: CookingResult) {
  await updateRoom(roomId, (room) => ({
    ...room,
    result,
    phase: 'RESULT',
  }));
}

export async function getRoomWithVersion(roomId: string, sinceVersion?: number) {
  const room = await getRoom(roomId);
  if (!room) return { status: 'missing' as const };
  if (sinceVersion && room.version <= sinceVersion) {
    return { status: 'unchanged' as const };
  }
  return { status: 'full' as const, room };
}
