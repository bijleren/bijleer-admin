import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, CheckCircle, XCircle, Video } from 'lucide-react';

interface Registration {
  id: string;
  email: string;
  wants_recording: boolean;
  attended: boolean;
  created_at: string;
}

interface DemoSession {
  id: string;
  title: string;
  session_date: string;
  platform?: {
    name: string;
  };
}

export default function DemoRegistrations() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from('demo_sessions')
        .select(`
          *,
          platform:demo_platforms(*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: registrationsData, error: registrationsError } = await supabase
        .from('demo_registrations')
        .select('*')
        .eq('demo_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (registrationsError) throw registrationsError;

      setSession(sessionData);
      setRegistrations(registrationsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (registrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('demo_registrations')
        .update({ attended: !currentStatus })
        .eq('id', registrationId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Session not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/platform/demo')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demo Registrations</h1>
          <p className="text-gray-600 mt-1">
            {session.title} - {formatDate(session.session_date)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Registrations ({registrations.length})
          </h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">
                Attended: {registrations.filter((r) => r.attended).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">
                Want Recording: {registrations.filter((r) => r.wants_recording).length}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wants Recording
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attended
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{registration.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {formatDate(registration.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {registration.wants_recording ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() =>
                        toggleAttendance(registration.id, registration.attended)
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        registration.attended
                          ? 'bg-green-100 hover:bg-green-200'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {registration.attended ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {registrations.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No registrations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
