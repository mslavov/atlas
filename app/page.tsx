import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8 text-white">
          Integration Platform MVP
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Connect and sync data from GitHub, Notion, and Jira
        </p>
        <Link
          href="/connections"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition-colors"
        >
          Manage Connections
        </Link>
      </div>
    </main>
  );
}
