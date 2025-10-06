import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import YouTubeFeed from './components/YouTubeFeed'
import YouTubeHeader from './components/YouTubeHeader'
import YouTubeSidebar from './components/YouTubeSidebar'
import VideoUpload from './components/VideoUpload'
import UserProfile from './components/UserProfile'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import DashboardIndex from './components/Dashboard/Index'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-900">
          <YouTubeHeader />
          <div className="flex">
            <YouTubeSidebar />
            <main className="flex-1">
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
                <Route path="/upload" element={<ProtectedRoute><VideoUpload /></ProtectedRoute>} />
                
                {/* Public feed */}
                <Route path="/" element={<YouTubeFeed />} />

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
            </main>
          </div>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
