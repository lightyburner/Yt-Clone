import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import Feed from './components/Feed'
import UserProfile from './components/UserProfile'
import NavBar from './components/NavBar'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import DashboardIndex from './components/Dashboard/Index'

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavBar />
        <Routes>
          {/* Public routes - only accessible when not logged in */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } 
          />
          
          {/* Protected routes - only accessible when logged in */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardIndex /></ProtectedRoute>} />
          
          {/* Public feed */}
          <Route path="/" element={<Feed />} />

          {/* Profile management */}
          <Route 
            path="/me" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
