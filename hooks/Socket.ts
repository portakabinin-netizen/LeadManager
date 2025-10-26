// hooks/socket.ts
import { BASE_URL } from "@/app/myscript/base_url";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      autoConnect: true,
      transports: ["websocket"], // Expo Go compatible
    });

    socket.on("connect", () => console.log("✅ Socket connected:", socket?.id));
    socket.on("disconnect", () => console.log("❌ Socket disconnected"));
  }
  return socket;
};
