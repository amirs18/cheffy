import { AnamConversation } from '@/app/components/anam-conversation';

export default function AnamPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Anam + ElevenLabs Agent
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time conversation with AI-powered avatar and voice synthesis
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <AnamConversation />
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Powered by{' '}
            <span className="font-semibold text-purple-600">Anam</span> avatars
            and{' '}
            <span className="font-semibold text-blue-600">ElevenLabs</span>{' '}
            voice AI
          </p>
        </div>
      </div>
    </main>
  );
}
