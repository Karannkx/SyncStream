import { create } from 'zustand';

export interface Room {
  roomId: string;
  code: string;
  movieUrl: string;
  title: string;
  currentTime: number;
  isPlaying: boolean;
  createdBy: string;
  createdAt: number;
  activeUserCount: number;
  syncAt?: number;
}

interface RoomState {
  room: Room | null;
  setRoom: (room: Room | null) => void;
  updatePlayback: (currentTime: number, isPlaying: boolean) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  updatePlayback: (currentTime, isPlaying) => 
    set((state) => ({
      room: state.room ? { ...state.room, currentTime, isPlaying } : null
    })),
}));
