import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Schools from './pages/Schools';
import SchoolDetail from './pages/SchoolDetail';
import Newsletters from './pages/Newsletters';
import Vormingen from './pages/Vormingen';
import FAQ from './pages/FAQ';
import Technieken from './pages/Technieken';
import DigiTools from './pages/DigiTools';
import ActivityTime from './pages/ActivityTime';
import Tables from './pages/Tables';
import Klankteken from './pages/Klankteken';
import Vocabulary from './pages/Vocabulary';
import Lidwoorden from './pages/Lidwoorden';
import CheckKlankteken from './pages/CheckKlankteken';
import CheckBetekenis from './pages/CheckBetekenis';
import Statistics from './pages/Statistics';
import Analysis from './pages/Analysis';
import EducationalVideos from './pages/EducationalVideos';
import WritingExercises from './pages/WritingExercises';
import PhysicalTasks from './pages/PhysicalTasks';
import LearningGames from './pages/LearningGames';
import VocabularyManagement from './pages/VocabularyManagement';
import NewWords from './pages/NewWords';
import QuickReview from './pages/QuickReview';
import PhonemeFrequency from './pages/PhonemeFrequency';
import MissingImages from './pages/MissingImages';
import GenerateImages from './pages/GenerateImages';
import DemoManagement from './pages/DemoManagement';
import PublicDemos from './pages/PublicDemos';
import DemoRegistrations from './pages/DemoRegistrations';
import DemoSession from './pages/DemoSession';
import LicenseOverview from './pages/LicenseOverview';
import VoucherManagement from './pages/VoucherManagement';
import ManualGrants from './pages/ManualGrants';
import LicenseReports from './pages/LicenseReports';
import ProductManagement from './pages/ProductManagement';
import ContactMessages from './pages/ContactMessages';
import Klankgroepen from './pages/Klankgroepen';
import ExecutiveFunctions from './pages/ExecutiveFunctions';
import BehaviorCards from './pages/BehaviorCards';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/demos" element={<PublicDemos />} />
          <Route path="/demos/:identifier" element={<DemoSession />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="schools" element={<Schools />} />
            <Route path="schools/:id" element={<SchoolDetail />} />
            <Route path="didactiek/nieuwsbrieven" element={<Newsletters />} />
            <Route path="didactiek/vormingen" element={<Vormingen />} />
            <Route path="didactiek/faq" element={<FAQ />} />
            <Route path="didactiek/technieken" element={<Technieken />} />
            <Route path="apps/digitools" element={<DigiTools />} />
            <Route path="apps/activi-tijd" element={<ActivityTime />} />
            <Route path="apps/executieve-functies" element={<ExecutiveFunctions />} />
            <Route path="apps/gedragskaarten" element={<BehaviorCards />} />
            <Route path="woordenschat/klankteken" element={<Klankteken />} />
            <Route path="woordenschat/woorden" element={<Vocabulary />} />
            <Route path="woordenschat/nieuwe-woorden" element={<NewWords />} />
            <Route path="woordenschat/snelle-review" element={<QuickReview />} />
            <Route path="woordenschat/lidwoorden" element={<Lidwoorden />} />
            <Route path="woordenschat/check-klankteken" element={<CheckKlankteken />} />
            <Route path="woordenschat/check-betekenis" element={<CheckBetekenis />} />
            <Route path="woordenschat/statistiek" element={<Statistics />} />
            <Route path="woordenschat/analyse" element={<Analysis />} />
            <Route path="woordenschat/foneem-frequentie" element={<PhonemeFrequency />} />
            <Route path="woordenschat/missing-images" element={<MissingImages />} />
            <Route path="woordenschat/genereer-afbeeldingen" element={<GenerateImages />} />
            <Route path="woordenschat/klankgroepen" element={<Klankgroepen />} />
            <Route path="kleuterdidactiek/videos" element={<EducationalVideos />} />
            <Route path="kleuterdidactiek/schrijf" element={<WritingExercises />} />
            <Route path="kleuterdidactiek/doe" element={<PhysicalTasks />} />
            <Route path="kleuterdidactiek/speel" element={<LearningGames />} />
            <Route path="kleuterdidactiek/woordenschat" element={<VocabularyManagement />} />
            <Route path="tables" element={<Tables />} />
            <Route path="platform/demo" element={<DemoManagement />} />
            <Route path="platform/demo/:sessionId/registrations" element={<DemoRegistrations />} />
            <Route path="platform/contact-messages" element={<ContactMessages />} />
            <Route path="licensing/overview" element={<LicenseOverview />} />
            <Route path="licensing/vouchers" element={<VoucherManagement />} />
            <Route path="licensing/manual-grants" element={<ManualGrants />} />
            <Route path="licensing/reports" element={<LicenseReports />} />
            <Route path="licensing/products" element={<ProductManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
