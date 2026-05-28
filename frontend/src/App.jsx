import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import BottomTab from './components/BottomTab'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Register from './pages/Register'
import Subscription from './pages/Subscription'
import ManageSubscription from './pages/ManageSubscription'
import Conversations from './pages/Conversations'
import Favorites from './pages/Favorites'
import Toast from './components/Toast'
import Admin from './pages/Admin'
import ContentManager from './pages/ContentManager'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import EditProfile from './pages/EditProfile'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import SearchPage from './pages/Search'
import Orders from './pages/Orders'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <div className="app-root">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
        <Route path="/explore" element={
          <ProtectedRoute>
            <Explore />
          </ProtectedRoute>
        } />
        <Route path="/profile/:charId" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/chat/:charId" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />
        <Route path="/conversations" element={
          <ProtectedRoute>
            <Conversations />
          </ProtectedRoute>
        } />
        <Route path="/subscribe/:charId" element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        } />
        {/* Favorites */}
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        } />
        {/* Subscription Management */}
        <Route path="/manage-subscription" element={
          <ProtectedRoute>
            <ManageSubscription />
          </ProtectedRoute>
        } />
        {/* Forgot Password (no auth guard) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* Reset Password (no auth guard) */}
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Edit Profile */}
        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } />
        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        {/* Notifications */}
        <Route path="/orders" element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        {/* Search */}
        <Route path="/search" element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        } />
        {/* Admin Dashboard (no auth guard — admin handles its own auth) */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/posts" element={<ContentManager />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <BottomTab />}
      <Toast />
    </div>
  )
}
