import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Users, CheckCircle, ArrowLeft } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  description: string;
}

interface DemoSession {
  id: string;
  platform_id: string;
  session_date: string;
  title: string;
  description: string;
  max_participants: number | null;
  recording_url: string | null;
  slug: string | null;
  platform?: Platform;
  registration_count?: number;
  is_full?: boolean;
}

export default function DemoSession() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [wantsRecording, setWantsRecording] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [identifier]);

  const fetchSession = async () => {
    if (!identifier) return;

    try {
      setLoading(true);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      const query = supabase
        .from('demo_sessions')
        .select(`
          *,
          platform:demo_platforms(*)
        `)
        .eq('is_published', true);

      const { data: sessionData, error } = isUUID
        ? await query.eq('id', identifier).maybeSingle()
        : await query.eq('slug', identifier).maybeSingle();

      if (error) throw error;

      if (!sessionData) {
        navigate('/demos');
        return;
      }

      const { count } = await supabase
        .from('demo_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('demo_session_id', sessionData.id);

      const isFull = sessionData.max_participants ? (count || 0) >= sessionData.max_participants : false;

      setSession({
        ...sessionData,
        registration_count: count || 0,
        is_full: isFull,
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      navigate('/demos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) return;

    try {
      setRegistering(true);

      const { error } = await supabase.from('demo_registrations').insert([
        {
          demo_session_id: session.id,
          email: email,
          wants_recording: wantsRecording,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          alert('You are already registered for this demo session.');
        } else {
          throw error;
        }
        return;
      }

      setRegistrationSuccess(true);
    } catch (error) {
      console.error('Error registering:', error);
      alert('Error registering for demo. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isPastSession = new Date(session.session_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/demos')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Sessions
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mb-4">
                {session.platform?.name}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{session.title}</h1>
              {session.description && (
                <p className="text-lg text-gray-600">{session.description}</p>
              )}
            </div>

            <div className="space-y-3 mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{formatDate(session.session_date)}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-blue-600" />
                <span>
                  {session.registration_count} registered
                  {session.max_participants && ` (max ${session.max_participants})`}
                </span>
              </div>
            </div>

            {isPastSession ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">This session has already taken place.</p>
                <button
                  onClick={() => navigate('/demos')}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  View Other Sessions
                </button>
              </div>
            ) : registrationSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                <p className="text-gray-600 mb-6">
                  You will receive a confirmation email with the demo session details.
                </p>
                <button
                  onClick={() => navigate('/demos')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Other Sessions
                </button>
              </div>
            ) : session.is_full ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">This session is currently full.</p>
                <button
                  onClick={() => navigate('/demos')}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  View Other Sessions
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Register for This Session</h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="wants_recording"
                    checked={wantsRecording}
                    onChange={(e) => setWantsRecording(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <label htmlFor="wants_recording" className="ml-3 text-sm text-gray-700">
                    Send me the recording after the demo session
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-lg"
                >
                  {registering ? 'Registering...' : 'Register Now'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
