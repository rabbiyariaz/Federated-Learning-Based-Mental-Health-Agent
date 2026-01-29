/**
 * ClientNode component - Visualizes a federated learning client
 * @param {Object} client - Client object with id, name, status, dataSize, lastUpdate
 */
function ClientNode({ client }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'training':
        return 'bg-blue-500 animate-pulse';
      case 'idle':
        return 'bg-slate-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'training':
        return 'Training';
      case 'idle':
        return 'Idle';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s ago`;
    }
    return `${diffSecs}s ago`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-teal-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></div>
          <h3 className="font-semibold text-slate-200">{client.name}</h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          client.status === 'active' ? 'bg-green-900/30 text-green-300' :
          client.status === 'training' ? 'bg-blue-900/30 text-blue-300' :
          client.status === 'idle' ? 'bg-slate-700 text-slate-300' :
          'bg-red-900/30 text-red-300'
        }`}>
          {getStatusLabel(client.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Data Size:</span>
          <span className="text-slate-300 font-medium">{client.dataSize.toLocaleString()} samples</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Last Update:</span>
          <span className="text-slate-300">{formatTimeAgo(client.lastUpdate)}</span>
        </div>
      </div>
    </div>
  );
}

export default ClientNode;

