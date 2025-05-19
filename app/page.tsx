// Simple UI with AI search bar
export default function Home() {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-4xl font-bold mb-8">ROAM AI</h1>
        <input
          type="text"
          placeholder="Describe an event (e.g., 'Beach yoga tomorrow')"
          className="bg-gray-800 p-4 rounded-lg w-full max-w-xl"
        />
        <button className="bg-blue-600 px-6 py-2 rounded-lg mt-4">
          Create Event
        </button>
      </div>
    )
  }
