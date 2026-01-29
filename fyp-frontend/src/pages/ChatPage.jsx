import { useState, useRef, useEffect } from 'react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { sendChatMessage } from '../utils/api';
import { saveHistoryEntry } from '../utils/storage';

function ChatPage() {
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm here to listen and provide support. How are you feeling today? Feel free to share what's on your mind.",
      type: 'agent',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Add user message immediately
    const userMessage = {
      text,
      type: 'user',
      timestamp: new Date().toISOString(),
    };

    let currentMessages;
    setMessages((prev) => {
      currentMessages = [...prev, userMessage];
      return currentMessages;
    });
    setIsLoading(true);

    try {
      // Call mock API (pass current messages as history)
      const response = await sendChatMessage(text, currentMessages);

      // Add agent response
      const agentMessage = {
        text: response.response,
        type: 'agent',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updatedMessages = [...prev, agentMessage];

        // Save to history after each exchange (user message + agent response)
        // Only save if there's at least one user message (excluding the initial greeting)
        const userMessages = updatedMessages.filter(m => m.type === 'user');
        if (userMessages.length > 0) {
          const historyEntry = {
            id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'chat',
            timestamp: new Date().toISOString(),
            data: {
              messages: updatedMessages,
              messageCount: updatedMessages.length,
              lastMessage: agentMessage.text,
              lastUserMessage: userMessage.text,
            },
          };
          saveHistoryEntry(historyEntry);
        }

        return updatedMessages;
      });
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage = {
        text: "I'm sorry, I encountered an error. Please try again.",
        type: 'agent',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-teal-400 mb-2">Chat with Agent</h1>
        <p className="text-slate-300 text-sm">
          Have a conversation with the mental health AI agent. Share your thoughts and feelings.
        </p>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700"
        style={{ minHeight: 0 }}
      >
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}

export default ChatPage;
