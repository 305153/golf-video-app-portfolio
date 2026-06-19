import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="header">
      <div className="header-content">
        <h1>MySwing</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button className="sign-out-btn" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header