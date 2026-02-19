import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Users, Video, CheckCircle, Clock } from 'lucide-react';

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
  platform?: Platform;
  registration_count?: number;
  is_full?: boolean;
}

export default function PublicDemos() {
  const [upcomingSessions, setUpcomingSessions] = useState<DemoSession[]>([]);
  const [pastSessions, setPastSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const [email, setEmail] = useState('');
  const [wantsRecording, setWantsRecording] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { data: sessionsData, error } = await supabase
        .from('demo_sessions')
        .select(`
          *,
          platform:demo_platforms(*)
        `)
        .eq('is_published', true)
        .order('session_date');

      if (error) throw error;

      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('demo_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('demo_session_id', session.id);

          const isFull = session.max_participants ? (count || 0) >= session.max_participants : false;

          return {
            ...session,
            registration_count: count || 0,
            is_full: isFull,
          };
        })
      );

      const upcoming = sessionsWithCounts.filter(
        (session) => new Date(session.session_date) >= new Date(now)
      );
      const past = sessionsWithCounts.filter(
        (session) => new Date(session.session_date) < new Date(now)
      );

      setUpcomingSessions(upcoming);
      setPastSessions(past);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRegistrationModal = (session: DemoSession) => {
    setSelectedSession(session);
    setEmail('');
    setWantsRecording(false);
    setRegistrationSuccess(false);
  };

  const closeRegistrationModal = () => {
    setSelectedSession(null);
    setEmail('');
    setWantsRecording(false);
    setRegistrationSuccess(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSession) return;

    try {
      setRegistering(true);

      const { error } = await supabase.from('demo_registrations').insert([
        {
          demo_session_id: selectedSession.id,
          email: email,
          wants_recording: wantsRecording,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          alert('Je bent al ingeschreven voor deze demosessie.');
        } else {
          throw error;
        }
        return;
      }

      setRegistrationSuccess(true);
      setTimeout(() => {
        closeRegistrationModal();
        fetchSessions();
      }, 2000);
    } catch (error) {
      console.error('Error registering:', error);
      alert('Fout bij inschrijven voor demo. Probeer het opnieuw.');
    } finally {
      setRegistering(false);
    }
  };

  const requestRecording = async (sessionId: string, sessionTitle: string) => {
    const email = prompt('Voer je e-mailadres in om de opname te ontvangen:');
    if (!email) return;

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert('Voer een geldig e-mailadres in.');
      return;
    }

    try {
      const { error } = await supabase.from('demo_registrations').insert([
        {
          demo_session_id: sessionId,
          email: email,
          wants_recording: true,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          alert('Je hebt de opname voor deze sessie al aangevraagd.');
        } else {
          throw error;
        }
        return;
      }

      alert('Opname-aanvraag ingediend! Je ontvangt de opnamelink via e-mail.');
    } catch (error) {
      console.error('Error requesting recording:', error);
      alert('Fout bij indienen van aanvraag. Probeer het opnieuw.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
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
          <p className="mt-4 text-gray-600">Demosessies laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Platform Demosessies</h1>
          <p className="text-lg text-gray-600">
            Neem deel aan onze live demosessies om onze platforms in actie te zien
          </p>
        </div>

        {upcomingSessions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Aankomende Sessies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mb-2">
                          {session.platform?.name}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
                      </div>
                    </div>

                    {session.description && (
                      <div
                        className="text-gray-600 mb-4 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: session.description }}
                      />
                    )}

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(session.session_date)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {session.registration_count} ingeschreven
                        {session.max_participants && ` (max ${session.max_participants})`}
                      </div>
                    </div>

                    <button
                      onClick={() => openRegistrationModal(session)}
                      disabled={session.is_full}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        session.is_full
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {session.is_full ? 'Sessie Vol' : 'Inschrijven'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastSessions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Afgelopen Sessies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden opacity-90"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full mb-2">
                          {session.platform?.name}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
                      </div>
                    </div>

                    {session.description && (
                      <div
                        className="text-gray-600 mb-4 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: session.description }}
                      />
                    )}

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {formatDate(session.session_date)}
                      </div>
                    </div>

                    <button
                      onClick={() => requestRecording(session.id, session.title)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Opname Aanvragen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingSessions.length === 0 && pastSessions.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">Geen Demosessies Beschikbaar</h3>
            <p className="text-gray-500">Kom binnenkort terug voor aankomende demosessies!</p>
          </div>
        )}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              {registrationSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Inschrijving Geslaagd!</h2>
                  <p className="text-gray-600">
                    Je ontvangt een bevestigingsmail met de details van de demosessie.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Inschrijven voor Demo</h2>
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg text-gray-900">{selectedSession.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(selectedSession.session_date)}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mailadres *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label htmlFor="wants_recording" className="ml-2 text-sm text-gray-700">
                        Stuur mij de opname na de demosessie
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={registering}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {registering ? 'Inschrijven...' : 'Inschrijven'}
                      </button>
                      <button
                        type="button"
                        onClick={closeRegistrationModal}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
