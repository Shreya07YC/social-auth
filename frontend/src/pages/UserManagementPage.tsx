import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { api, type UserData, type UserFilters, type UserStatsResponse } from '../services/api'

export function UserManagementPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuthContext()
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<UserStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [processingUserId, setProcessingUserId] = useState<number | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [perPage] = useState(10)

  // Filters
  const [search, setSearch] = useState('')
  const [loginType, setLoginType] = useState<'all' | 'email' | 'google'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'email' | 'provider' | 'updatedAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const getFilters = useCallback((): UserFilters => ({
    page: currentPage,
    limit: perPage,
    search: search || undefined,
    loginType: loginType !== 'all' ? loginType : undefined,
    sortBy,
    sortOrder,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [currentPage, perPage, search, loginType, sortBy, sortOrder, startDate, endDate])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.getUsers(getFilters())
      setUsers(response.data)
      setTotalPages(response.meta.lastPage)
      setTotalUsers(response.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [getFilters])

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.getUserStats()
      setStats(response)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers()
      fetchStats()
    }
  }, [isAuthenticated, fetchUsers, fetchStats])

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      await api.exportUsersExcel(getFilters())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await api.exportUsersPdf(getFilters())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleGrantAdmin = async (userId: number) => {
    if (!confirm('Are you sure you want to grant admin access to this user?')) return
    
    setProcessingUserId(userId)
    setError(null)
    try {
      const response = await api.grantAdmin(userId)
      setSuccessMsg(response.message)
      // Update user in list
      setUsers(users.map(u => u.id === userId ? { ...u, role: 'admin' } : u))
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant admin access')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleRevokeAdmin = async (userId: number) => {
    if (!confirm('Are you sure you want to revoke admin access from this user?')) return
    
    setProcessingUserId(userId)
    setError(null)
    try {
      const response = await api.revokeAdmin(userId)
      setSuccessMsg(response.message)
      // Update user in list
      setUsers(users.map(u => u.id === userId ? { ...u, role: 'user' } : u))
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke admin access')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const resetFilters = () => {
    setSearch('')
    setLoginType('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  if (authLoading) {
    return <div style={styles.loading}>Loading...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>User Management</h1>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Back to Home
        </button>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total Users</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.emailUsers}</span>
            <span style={styles.statLabel}>Email Users</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.googleUsers}</span>
            <span style={styles.statLabel}>Google Users</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #FF9800' }}>
            <span style={{ ...styles.statValue, color: '#FF9800' }}>{stats.adminUsers}</span>
            <span style={styles.statLabel}>Admins</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>Search</button>
        </form>

        <div style={styles.filterRow}>
          <select
            value={loginType}
            onChange={(e) => setLoginType(e.target.value as typeof loginType)}
            style={styles.select}
          >
            <option value="all">All Login Types</option>
            <option value="email">Normal (Email)</option>
            <option value="google">Google Auth</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.dateInput}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.dateInput}
          />

          <button onClick={resetFilters} style={styles.resetButton}>Reset</button>
        </div>

        {/* Export Buttons */}
        <div style={styles.exportContainer}>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            style={{ ...styles.exportButton, ...styles.excelButton }}
          >
            {exportingExcel ? 'Exporting...' : '📊 Download Excel'}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            style={{ ...styles.exportButton, ...styles.pdfButton }}
          >
            {exportingPdf ? 'Exporting...' : '📄 Download PDF'}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && <div style={styles.success}>{successMsg}</div>}

      {/* Error Message */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Users Table */}
      <div style={styles.tableContainer}>
        {isLoading ? (
          <div style={styles.loading}>Loading users...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Avatar</th>
                <th style={{ ...styles.th, ...styles.sortable }} onClick={() => handleSort('email')}>
                  Full Name {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ ...styles.th, ...styles.sortable }} onClick={() => handleSort('email')}>
                  Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ ...styles.th, ...styles.sortable }} onClick={() => handleSort('provider')}>
                  Login Type {sortBy === 'provider' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={styles.th}>Role</th>
                <th style={{ ...styles.th, ...styles.sortable }} onClick={() => handleSort('createdAt')}>
                  Registered {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.noData}>No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.id}</td>
                    <td style={styles.td}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" style={styles.avatar} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>N/A</div>
                      )}
                    </td>
                    <td style={styles.td}>{user.fullName}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={user.loginType === 'Google Auth' ? styles.googleBadge : styles.emailBadge}>
                        {user.loginType}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={user.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                        {user.role === 'admin' ? '👑 Admin' : 'User'}
                      </span>
                    </td>
                    <td style={styles.td}>{user.registeredAt}</td>
                    <td style={styles.td}>
                      {user.role === 'admin' ? (
                        <button
                          onClick={() => handleRevokeAdmin(user.id)}
                          disabled={processingUserId === user.id || currentUser?.id === user.id}
                          style={{
                            ...styles.actionButton,
                            ...styles.revokeButton,
                            opacity: currentUser?.id === user.id ? 0.5 : 1,
                          }}
                          title={currentUser?.id === user.id ? "Can't revoke your own access" : 'Revoke admin access'}
                        >
                          {processingUserId === user.id ? '...' : '✕ Revoke'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrantAdmin(user.id)}
                          disabled={processingUserId === user.id}
                          style={{ ...styles.actionButton, ...styles.grantButton }}
                        >
                          {processingUserId === user.id ? '...' : '✓ Grant Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={styles.pageButton}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages} ({totalUsers} users)
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  statsContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#4472C4',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  },
  searchForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: '#4472C4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '160px',
  },
  dateInput: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  exportContainer: {
    display: 'flex',
    gap: '12px',
  },
  exportButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  excelButton: {
    backgroundColor: '#217346',
    color: '#fff',
  },
  pdfButton: {
    backgroundColor: '#D32F2F',
    color: '#fff',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '900px',
  },
  th: {
    backgroundColor: '#4472C4',
    color: '#fff',
    padding: '14px 12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  sortable: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#333',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#666',
  },
  googleBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  emailBadge: {
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  adminBadge: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  userBadge: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  grantButton: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  revokeButton: {
    backgroundColor: '#f44336',
    color: '#fff',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#4472C4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
}
