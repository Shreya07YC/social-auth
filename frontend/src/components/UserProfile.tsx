import { useAuthContext } from '../context/AuthContext'

export function UserProfile() {
  const { user, logout } = useAuthContext()

  if (!user) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '320px',
      }}
    >
      {user.avatar && (
        <img
          src={user.avatar}
          alt={user.name}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#1f1f1f' }}>
          {user.name}
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#5f6368' }}>
          {user.email}
        </p>
      </div>
      <button
        onClick={logout}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#ffffff',
          backgroundColor: '#ea4335',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d33426')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ea4335')}
      >
        Sign Out
      </button>
    </div>
  )
}
