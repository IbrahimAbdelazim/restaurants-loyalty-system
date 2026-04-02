import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        <div>
          <span className="text-6xl">🍽️</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Restaurant Loyalty POC</h1>
          <p className="text-gray-500 mt-2">Select your role to continue</p>
        </div>

        <div className="flex gap-6 justify-center">
          <Link
            href="/waiter"
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all w-48"
          >
            <span className="text-4xl">👨‍🍳</span>
            <div>
              <p className="font-bold text-gray-900 text-lg">Waiter App</p>
              <p className="text-xs text-gray-500 mt-1">Tablet · Guest lookup</p>
            </div>
          </Link>

          <Link
            href="/cashier"
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all w-48"
          >
            <span className="text-4xl">🧾</span>
            <div>
              <p className="font-bold text-gray-900 text-lg">Cashier App</p>
              <p className="text-xs text-gray-500 mt-1">POS · Order entry</p>
            </div>
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Open both apps side by side to simulate the full flow
        </p>
      </div>
    </div>
  );
}
