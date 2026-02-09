import ChatInterface from '@/components/ChatInterface';
import NavHeader from '@/components/NavHeader';

export const metadata = {
    title: 'AI Chat | UA Parking Analytics',
    description: 'Ask questions about the parking survey data using natural language',
};

export default function ChatPage() {
    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <NavHeader subtitle="AI Survey Analyst" />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 mb-8 border border-blue-800/50">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">💡</div>
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-2">How It Works</h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                This AI assistant uses <strong>Retrieval-Augmented Generation (RAG)</strong> to answer
                                questions about the parking survey. It searches through 289 student responses, finds
                                the most relevant quotes, and uses them to generate accurate, source-backed answers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="h-[600px]">
                    <ChatInterface />
                </div>

                {/* Example Questions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <p className="text-gray-400 text-sm mb-2">Try asking:</p>
                        <p className="text-white">"What frustrates students most about finding parking?"</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <p className="text-gray-400 text-sm mb-2">Try asking:</p>
                        <p className="text-white">"What do students think about the bus system?"</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <p className="text-gray-400 text-sm mb-2">Try asking:</p>
                        <p className="text-white">"Are there any positive comments about parking?"</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
