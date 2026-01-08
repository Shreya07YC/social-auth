import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { api } from '../services/api'

interface Upload {
  id: number
  url: string
  originalName: string
  fileSize: number
  createdAt: string
}

export function UploadPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthContext()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      loadUploads()
    }
  }, [isAuthenticated])

  const loadUploads = async () => {
    try {
      const data = await api.getUploads()
      setUploads(data.uploads)
    } catch {
      console.error('Failed to load uploads')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)
    setSuccess(null)

    if (!file) {
      setSelectedFile(null)
      setPreview(null)
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.uploadImage(selectedFile)
      setSuccess('Image uploaded successfully!')
      setSelectedFile(null)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploads((prev) => [response.upload, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
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
        <div style={styles.welcome}>
          {user.avatar && <img src={user.avatar} alt="" style={styles.avatar} />}
          <span>Welcome, {user.name}!</span>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
      </header>

      <main style={styles.main}>
        <div style={styles.uploadCard}>
          <h2 style={styles.cardTitle}>Upload Image</h2>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <div style={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              style={styles.fileInput}
              id="file-input"
            />
            <label htmlFor="file-input" style={styles.fileLabel}>
              {preview ? (
                <img src={preview} alt="Preview" style={styles.previewImg} />
              ) : (
                <div style={styles.placeholder}>
                  <span style={styles.placeholderIcon}>📷</span>
                  <span>Click to select an image</span>
                  <span style={styles.hint}>JPG, PNG, GIF, WebP (max 5MB)</span>
                </div>
              )}
            </label>
          </div>

          {selectedFile && (
            <div style={styles.fileInfo}>
              <span>{selectedFile.name}</span>
              <span style={styles.fileSize}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              ...styles.uploadBtn,
              opacity: !selectedFile || uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>

        {uploads.length > 0 && (
          <div style={styles.uploadsSection}>
            <h3 style={styles.sectionTitle}>Your Uploads</h3>
            <div style={styles.uploadsGrid}>
              {uploads.map((upload) => (
                <div key={upload.id} style={styles.uploadItem}>
                  <img
                    src={api.getImageUrl(upload.url)}
                    alt={upload.originalName}
                    style={styles.uploadImg}
                  />
                  <span style={styles.uploadName}>{upload.originalName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
  welcome: { display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500 },
  avatar: { width: '36px', height: '36px', borderRadius: '50%' },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#5f6368',
    backgroundColor: 'transparent',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: { maxWidth: '800px', margin: '0 auto', padding: '24px' },
  uploadCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: { margin: '0 0 16px 0', fontSize: '20px', color: '#1f1f1f' },
  error: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#fce8e6',
    borderRadius: '4px',
    color: '#c5221f',
    fontSize: '14px',
  },
  success: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#e6f4ea',
    borderRadius: '4px',
    color: '#137333',
    fontSize: '14px',
  },
  uploadArea: { marginBottom: '16px' },
  fileInput: { display: 'none' },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    border: '2px dashed #dadce0',
    borderRadius: '8px',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: '#5f6368',
  },
  placeholderIcon: { fontSize: '48px' },
  hint: { fontSize: '12px', color: '#9aa0a6' },
  previewImg: { maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' },
  fileInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  fileSize: { color: '#5f6368' },
  uploadBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1a73e8',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  uploadsSection: { marginTop: '32px' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '18px', color: '#1f1f1f' },
  uploadsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
  },
  uploadItem: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  uploadImg: { width: '100%', height: '120px', objectFit: 'cover' },
  uploadName: {
    display: 'block',
    padding: '8px',
    fontSize: '12px',
    color: '#5f6368',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}
