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
import Tables from './pages/Tables';
import Klankteken from './pages/Klankteken';
import Vocabulary from './pages/Vocabulary';
import Statistics from './pages/Statistics';
import Analysis from './pages/Analysis';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="woordenschat/klankteken" element={<Klankteken />} />
            <Route path="woordenschat/woorden" element={<Vocabulary />} />
            <Route path="woordenschat/statistiek" element={<Statistics />} />
            <Route path="woordenschat/analyse" element={<Analysis />} />
            <Route path="tables" element={<Tables />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
