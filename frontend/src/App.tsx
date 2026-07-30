import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, ToastProvider } from './components';
import DashboardPage from './pages/Dashboard';
import PlansListPage from './pages/PlansList';
import PlanFormPage from './pages/PlanForm';
import PlanDetailPage from './pages/PlanDetail';
import RecommendPage from './pages/Recommend';
import ExercisesPage from './pages/Exercises';
import WorkoutPage from './pages/Workout';
import HistoryPage from './pages/History';
import HistoryDetailPage from './pages/HistoryDetail';
import StatsPage from './pages/Stats';
import SettingsPage from './pages/Settings';
import CalendarPage from './pages/Calendar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/plans" element={<PlansListPage />} />
              <Route path="/plans/recommend" element={<RecommendPage />} />
              <Route path="/plans/new" element={<PlanFormPage />} />
              <Route path="/plans/:id" element={<PlanDetailPage />} />
              <Route path="/plans/:id/edit" element={<PlanFormPage />} />
              <Route path="/exercises" element={<ExercisesPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:id" element={<HistoryDetailPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
