import Chat from '@/components/chat';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Roam AI</h1>
        <p className="text-xl text-center mb-12 text-gray-600">Your AI-powered event platform</p>
        <Chat />
      </div>
    </main>
  );
} 