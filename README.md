# 🎬 SyncStream

> **Synchronized watch parties, anywhere.**  
> Watch videos together in real-time — perfectly in sync, no matter where you are.

---

> ⚠️ **Active Development** — We are currently upgrading SyncStream. A significantly improved version with more features, better performance, and a redesigned experience is coming soon. Stay tuned.

---

## ✨ Features

- 🔴 **Real-time sync** — Play, pause, and seek — all viewers stay perfectly in sync
- 🎥 **Google Drive support** — Stream directly from shared Drive files, large or small
- 🔗 **Multi-platform playback** — YouTube, MP4, HLS, and more via ReactPlayer
- 💬 **Live chat** — Talk with your watch party in real-time
- 👥 **Online presence** — See who's in the room live
- 🔐 **Google Sign-in** — Quick auth or join as a guest with a display name
- 🛡️ **Admin controls** — Room host controls playback for all viewers
- 📱 **Responsive** — Works across desktop, tablet, and mobile
- ⚡ **No installs** — Fully browser-based, zero setup for viewers

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 |
| **Build Tool** | Vite 7 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Auth & Database** | Firebase (Auth + Firestore) |
| **State Management** | Zustand |
| **Video Player** | ReactPlayer v3 |
| **Animations** | Framer Motion |
| **Notifications** | Sonner |
| **Routing** | Wouter |

---

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @workspace/syncstream run dev
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── player/        # SyncPlayer — video sync engine
│   ├── chat/          # Real-time chat panel
│   └── room/          # Room header, online users
├── pages/             # RoomPage, HomePage, AuthPage
├── store/             # Zustand state (auth, room)
├── utils/             # URL detection, Drive helpers
├── hooks/             # Custom React hooks
└── lib/               # Firebase client init
```

---

## 🗺 Roadmap

- [ ] Host-controlled volume sync
- [ ] Subtitle/caption support
- [ ] Improved large-file streaming
- [ ] Room history & session replay
- [ ] Mobile app

---

## 📄 License

MIT © SyncStream
