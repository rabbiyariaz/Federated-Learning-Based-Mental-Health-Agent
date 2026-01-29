/**
 * ChatMessage component - Displays a single chat message bubble
 * @param {Object} message - Message object with text, type, and timestamp
 */
function ChatMessage({ message }) {
  const { text, type, timestamp } = message;
  const isUser = type === 'user';

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] sm:max-w-[65%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-teal-600 text-white rounded-br-sm'
              : 'bg-slate-700 text-slate-100 rounded-bl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        </div>
        {timestamp && (
          <p className={`text-xs text-slate-500 mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTime(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;

