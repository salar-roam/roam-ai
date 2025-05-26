// app/page.tsx
import Chat from "@/components/chat";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden"> {/* Occupies the whole screen and hides scroll */}
        <Chat />
    </main>
  );
}