
import { kv } from '@vercel/kv';

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

const ROOM_TTL_SECONDS = parseInt(process.env.ROOM_TTL_SECONDS ?? '21600', 10); // default 6h

const roomKey = (roomId: string) => `room:${roomId}`;

async function saveRoom(room: Room) {
  await kv.set(roomKey(room.id), room, { ex: ROOM_TTL_SECONDS });
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
  const room = await kv.get<Room>(roomKey(roomId));
  return room ?? null;
}

async function updateRoom(
  roomId: string,
  updater: (room: Room) => Room | null
): Promise<Room | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const next = updater({ ...room, players: [...room.players], ingredients: [...room.ingredients] });
  if (!next) return room;
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
