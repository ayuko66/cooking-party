// src/lib/store.ts

import { getRedis } from './redis';

export class StoreUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? 'Store unavailable');
    this.name = 'StoreUnavailableError';
  }
}
export { StoreUnavailableError as KvUnavailableError };

export const isVercelRuntime = Boolean(process.env.VERCEL);

export type StoreMode = 'redis' | 'memory' | 'none';

const DEFAULT_ROOM_TTL_SECONDS = 21600;
const parsedTtl = parseInt(process.env.ROOM_TTL_SECONDS ?? `${DEFAULT_ROOM_TTL_SECONDS}`, 10);
const ROOM_TTL_SECONDS =
  Number.isFinite(parsedTtl) && parsedTtl > 60 ? parsedTtl : DEFAULT_ROOM_TTL_SECONDS;

const isRedisConfigured = Boolean(process.env.REDIS_URL);
const allowMemoryFallback = !isVercelRuntime;

const preferredStore: StoreMode =
  isRedisConfigured ? 'redis' : allowMemoryFallback ? 'memory' : 'none';

const activeStore: StoreMode = preferredStore;

const INSTANCE_ID = Math.random().toString(36).slice(2, 10);

export const getStoreMode = (): StoreMode => activeStore;

export const getStoreDebug = () => ({
  isVercelRuntime,
  redisUrlPresent: Boolean(process.env.REDIS_URL),
  allowMemoryFallback,
  preferredStore,
  activeStore,
  instanceId: INSTANCE_ID,
});

export const normalizeRoomId = (roomId: string) => String(roomId ?? '').trim().toUpperCase();

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
  countdownEndTime?: number;
  result?: CookingResult;
  createdAt: number;
  updatedAt: number;
  version: number;
}

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

const adapter: StoreAdapter =
  activeStore === 'redis'
    ? {
        get: async <T>(key: string) => {
          try {
            const redis = await getRedis();
            const value = await redis.get(key);
            return value ? (JSON.parse(value) as T) : null;
          } catch {
            throw new StoreUnavailableError('Redis unavailable');
          }
        },
        set: async (key: string, value: any, opts?: { ex?: number }) => {
          try {
            const redis = await getRedis();
            const payload = JSON.stringify(value);
            if (opts?.ex) await redis.set(key, payload, { EX: opts.ex });
            else await redis.set(key, payload);
          } catch {
            throw new StoreUnavailableError('Redis unavailable');
          }
        },
      }
    : activeStore === 'memory'
      ? memoryStore
      : {
          get: async () => {
            throw new StoreUnavailableError('REDIS_URL is not configured');
          },
          set: async () => {
            throw new StoreUnavailableError('REDIS_URL is not configured');
          },
        };

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

async function updateRoom(roomId: string, updater: (room: Room) => Room | null): Promise<Room | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const next = updater({ ...room, players: [...room.players], ingredients: [...room.ingredients] });
  if (!next) {
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
    const player: Player = { id: Math.random().toString(36).substring(2, 10), nickname };
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
