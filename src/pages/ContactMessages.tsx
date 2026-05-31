import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Calendar, User, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ContactMessage {
  id: string;
  created_at: string;
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  ip: string | null;
  status: string;
  notes: string | null;
  replied_at: string | null;
  replied_by: string | null;
}

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading contact messages:', error);
      alert('Error loading contact messages');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };

      if (status === 'replied') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.replied_at = new Date().toISOString();
        updates.replied_by = user?.email || null;
      }

      const { error } = await supabase
        .from('contact_messages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, ...updates });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const updateNotes = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, notes } : m));
      if (selectedMessage) {
        setSelectedMessage({ ...selectedMessage, notes });
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Error updating notes');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      new: AlertCircle,
      in_progress: Clock,
      replied: CheckCircle,
      archived: CheckCircle
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;
    const style = styles[status as keyof typeof styles] || styles.new;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredMessages = messages.filter(msg => {
    const matchesStatus = filterStatus === 'all' || msg.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading contact messages...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Messages</h1>
        <p className="text-gray-600">Manage and respond to contact form submissions</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name, email, subject, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-4">
              Messages ({filteredMessages.length})
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    setNotes(message.notes || '');
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{message.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{message.email}</p>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">{message.subject}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{message.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(message.created_at).toLocaleDateString('nl-BE')}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded">{message.type}</span>
                  </div>
                </div>
              ))}
              {filteredMessages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No messages found
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedMessage ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedMessage.status)}
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      {selectedMessage.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedMessage.name}</p>
                    <a href={`mailto:${selectedMessage.email}`} className="text-sm text-blue-600 hover:underline">
                      {selectedMessage.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Received</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedMessage.created_at).toLocaleString('nl-BE')}
                    </p>
                  </div>
                </div>

                {selectedMessage.replied_at && (
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Replied</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedMessage.replied_at).toLocaleString('nl-BE')}
                        {selectedMessage.replied_by && ` by ${selectedMessage.replied_by}`}
                      </p>
                    </div>
                  </div>
                )}

                {selectedMessage.ip && (
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">IP Address</p>
                      <p className="font-medium text-gray-900">{selectedMessage.ip}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this contact message..."
                />
                <button
                  onClick={() => updateNotes(selectedMessage.id)}
                  className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Save Notes
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStatus(selectedMessage.id, 'new')}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    New
                  </button>
                  <button
                    onClick={() => updateStatus(selectedMessage.id, 'in_progress')}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => updateStatus(selectedMessage.id, 'replied')}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Replied
                  </button>
                  <button
                    onClick={() => updateStatus(selectedMessage.id, 'archived')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Archived
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
