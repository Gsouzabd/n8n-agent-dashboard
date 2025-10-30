import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { ThemeProvider } from './contexts/ThemeContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { AgentList } from './pages/AgentList'
import { AgentForm } from './pages/AgentForm'
import { KnowledgeBase } from './pages/KnowledgeBase'
import { ThemeSettings } from './pages/ThemeSettings'
import { Organizations } from './pages/Organizations'
import { AgentWidget } from './pages/AgentWidget'
import { AgentQuality } from './pages/AgentQuality'
import { AgentMonitor } from './pages/AgentMonitor'
import { AdminPanel } from './pages/AdminPanel'
import OpenAICosts from './pages/OpenAICosts'
import LandingPage from './pages/LandingPage'
import WidgetEmbed from './pages/WidgetEmbed'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <OrganizationProvider>
            <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AgentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/new"
              element={
                <ProtectedRoute>
                  <AgentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/:id/edit"
              element={
                <ProtectedRoute>
                  <AgentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/:id/knowledge"
              element={
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/theme"
              element={
                <ProtectedRoute>
                  <ThemeSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizations"
              element={
                <ProtectedRoute>
                  <Organizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/:id/widget"
              element={
                <ProtectedRoute>
                  <AgentWidget />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/:id/quality"
              element={
                <ProtectedRoute>
                  <AgentQuality />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents/:id/monitor"
              element={
                <ProtectedRoute>
                  <AgentMonitor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monitor"
              element={
                <ProtectedRoute>
                  <AgentMonitor />
                </ProtectedRoute>
              }
            />
            {/* Public embed route for widget iframe */}
            <Route path="/w/:widgetId" element={<WidgetEmbed />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/openai-costs"
              element={
                <ProtectedRoute>
                  <OpenAICosts />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App

