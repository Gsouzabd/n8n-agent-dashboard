import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { AgentList } from './pages/AgentList'
import { AgentForm } from './pages/AgentForm'
import { KnowledgeBase } from './pages/KnowledgeBase'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

