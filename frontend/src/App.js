import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import MainPages from './components/HosDashboard';
import { planTrip } from './utils/api';

const DEFAULT_START_TIME = '2026-05-08T18:11';
const LOADING_MESSAGES = [
  'Calculating route with OSRM...',
  'Applying FMCSA HOS rules...',
  'Generating daily log sheets...',
  'Building stop plan...',
];

function App() {
  const [currentPage, setCurrentPage] = useState('planner');
  const [theme, setTheme] = useState(() => localStorage.getItem('rg-theme') || 'dark');
  const [plannerTab, setPlannerTab] = useState('overview');
  const [formData, setFormData] = useState({
    driver_name: 'John Doe',
    hos_rules: '70-hour/8-day',
    start_location: 'New York, NY',
    pickup_location: 'Chicago, IL',
    end_location: 'Los Angeles, CA',
    start_time: DEFAULT_START_TIME,
    cycle_hours_used: 14,
  });
  const [tripPlan, setTripPlan] = useState(() => readStorage('routeguard-last-plan', null));
  const [history, setHistory] = useState(() => readStorage('routeguard-history', []));
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activePlan = useMemo(() => {
    if (currentPage === 'history' && selectedHistoryId) {
      return history.find((trip) => trip.trip_id === selectedHistoryId) || tripPlan;
    }
    return tripPlan;
  }, [currentPage, history, selectedHistoryId, tripPlan]);

  useEffect(() => {
    if (tripPlan) localStorage.setItem('routeguard-last-plan', JSON.stringify(tripPlan));
  }, [tripPlan]);

  useEffect(() => {
    localStorage.setItem('routeguard-history', JSON.stringify(history.slice(0, 12)));
  }, [history]);

  // FIX UI-5: persist the visual theme on the document root so CSS variables can flip the whole app.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rg-theme', theme);
  }, [theme]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cycle_hours_used' ? Number(value) : value,
    }));
  };

  const handlePlanTrip = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const plan = await planTrip(formData);
      const storedPlan = {
        ...plan,
        form: { ...formData },
        created_at: new Date().toISOString(),
        status: plan.compliance_status === 'VIOLATION' ? 'ERR' : plan.warnings?.length ? 'WARN' : 'OK',
      };
      setTripPlan(storedPlan);
      setHistory((prev) => [storedPlan, ...prev.filter((trip) => trip.trip_id !== storedPlan.trip_id)]);
      setSelectedHistoryId(storedPlan.trip_id);
      setPlannerTab('overview');
      setCurrentPage('planner');
    } catch (err) {
      const payload = err.response?.data;
      // FIX 7.5: surface API validation inline next to the relevant input.
      if (payload?.field) {
        setFieldErrors({ [fieldNameForApi(payload.field)]: payload.message });
      } else if (payload?.fields) {
        setFieldErrors(Object.fromEntries(payload.fields.map((field) => [fieldNameForApi(field), 'Required'])));
      } else {
        setError(payload?.message || payload?.detail || 'Unable to plan this trip. Check the backend server and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (plan) => {
    setSelectedHistoryId(plan.trip_id);
    setTripPlan(plan);
  };

  return (
    <div className="app-frame" data-theme={theme}>
      {/* FIX UI-2: restore all primary destinations with a clear active state and theme control. */}
      <header className="top-nav">
        <div className="nav-brand">
          <button className="hamburger" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar">Menu</button>
          <div className="nav-logo-badge">RG</div>
          <span className="nav-title">
            ROUTE<span className="nav-accent">GUARD</span><span className="nav-subtitle"> ELD</span>
          </span>
        </div>
        <nav className="nav-links" aria-label="Primary views">
          {[
            ['planner', 'Trip Planner'],
            ['dashboard', 'HOS Dashboard'],
            ['history', 'Log History'],
          ].map(([id, label]) => (
            <button key={id} className={currentPage === id ? 'nav-link active' : 'nav-link'} type="button" onClick={() => setCurrentPage(id)}>
              {label}
              {currentPage === id && <span className="nav-link-dot" />}
            </button>
          ))}
        </nav>
        <button className="theme-toggle" type="button" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>
      <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar
          formData={formData}
          loading={loading}
          tripPlan={tripPlan}
          history={history}
          onFormChange={handleFormChange}
          onSubmit={handlePlanTrip}
          onPageChange={setCurrentPage}
          onPlannerTabChange={setPlannerTab}
          onHistorySelect={handleHistorySelect}
          fieldErrors={fieldErrors}
        />
        <main className="workspace">
          {error && <div className="error-banner">{error}</div>}
          {loading && <LoadingState />}
          <MainPages
            page={currentPage}
            plannerTab={plannerTab}
            onPlannerTabChange={setPlannerTab}
            formData={activePlan?.form || formData}
            tripPlan={activePlan}
            history={history}
            selectedHistoryId={selectedHistoryId}
            onHistorySelect={handleHistorySelect}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % LOADING_MESSAGES.length), 1500);
    const slowTimer = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearInterval(timer);
      clearTimeout(slowTimer);
    };
  }, []);
  return (
    <div className="loading-panel">
      <div className="spinner" />
      <strong>{LOADING_MESSAGES[index]}</strong>
      {slow && <span>Route calculation is taking longer than expected. OSRM may be slow - please wait.</span>}
    </div>
  );
}

function fieldNameForApi(field) {
  return {
    current_location: 'start_location',
    start_location: 'start_location',
    dropoff_location: 'end_location',
    cycle_hours_used: 'cycle_hours_used',
  }[field] || field;
}

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default App;
