import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { pushNotificationService } from '../services/pushNotification'
import { NotificationBell } from '../components/NotificationBell'

export function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthContext()
  const navigate = useNavigate()
  const [notificationStatus, setNotificationStatus] = useState<string>('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializePushNotifications()
    }
  }, [isAuthenticated, user])

  const initializePushNotifications = async () => {
    if (!pushNotificationService.isSupported()) {
      setNotificationStatus('not-supported')
      return
    }

    const permission = pushNotificationService.getPermissionStatus()
    if (permission === 'granted') {
      const success = await pushNotificationService.initialize()
      setNotificationStatus(success ? 'enabled' : 'error')
    } else if (permission === 'default') {
      setNotificationStatus('prompt')
    } else {
      setNotificationStatus('denied')
    }
  }

  const handleEnableNotifications = async () => {
    setNotificationStatus('requesting')
    const success = await pushNotificationService.initialize()
    setNotificationStatus(success ? 'enabled' : 'denied')
  }

  const handleLogout = async () => {
    await pushNotificationService.removeToken()
    logout()
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Social Auth App</h1>
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>Home</Link>
          <Link to="/upload" style={styles.navLink}>Upload</Link>
          <NotificationBell />
          <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
        </nav>
      </header>

      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          {user.avatar && (
            <img src={user.avatar} alt={user.name || ''} style={styles.avatar} />
          )}
          <h2 style={styles.welcomeTitle}>Welcome, {user.name}!</h2>
          <p style={styles.email}>{user.email}</p>
          <p style={styles.provider}>
            Signed in via {user.provider === 'google' ? 'Google' : 'Email'}
          </p>

          {/* Notification Status */}
          {notificationStatus === 'prompt' && (
            <button onClick={handleEnableNotifications} style={styles.notificationBtn}>
              🔔 Enable Notifications
            </button>
          )}
          {notificationStatus === 'requesting' && (
            <p style={styles.notificationStatus}>Requesting permission...</p>
          )}
          {notificationStatus === 'enabled' && (
            <p style={{ ...styles.notificationStatus, color: '#4caf50' }}>🔔 Notifications enabled</p>
          )}
          {notificationStatus === 'denied' && (
            <p style={{ ...styles.notificationStatus, color: '#f44336' }}>🔕 Notifications blocked</p>
          )}

          <div style={styles.actions}>
            <Link to="/upload" style={styles.actionBtn}>
              📷 Upload Images
            </Link>
            <Link to="/admin/users" style={{ ...styles.actionBtn, backgroundColor: '#4472C4' }}>
              👥 User Management
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  logo: { margin: 0, fontSize: '20px', color: '#1f1f1f' },
  nav: { display: 'flex', alignItems: 'center', gap: '16px' },
  navLink: { color: '#5f6368', textDecoration: 'none', fontSize: '14px' },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#5f6368',
    backgroundColor: 'transparent',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 68px)',
    padding: '24px',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    marginBottom: '16px',
  },
  welcomeTitle: { margin: '0 0 8px 0', fontSize: '24px', color: '#1f1f1f' },
  email: { margin: '0 0 4px 0', fontSize: '16px', color: '#5f6368' },
  provider: { margin: '0 0 24px 0', fontSize: '14px', color: '#9aa0a6' },
  notificationBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ff9800',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  notificationStatus: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '16px',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1a73e8',
    borderRadius: '4px',
    textDecoration: 'none',
  },
}
