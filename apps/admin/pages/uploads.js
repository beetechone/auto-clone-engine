import { useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminUploads() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [templateId, setTemplateId] = useState('')
  const [assetType, setAssetType] = useState('logo')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File too large. Maximum size is 5MB.' })
        return
      }
      
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Invalid file type. Only images are allowed.' })
        return
      }

      setSelectedFile(file)
      setMessage(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!selectedFile || !templateId) {
      setMessage({ type: 'error', text: 'Please select a file and enter template ID' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('template_id', templateId)
      formData.append('asset_type', assetType)

      const res = await fetch(`${API_BASE}/admin/templates/upload`, {
        method: 'POST',
        body: formData
        // Note: In production, add auth headers here
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ 
          type: 'success', 
          text: `File uploaded successfully! URL: ${data.s3_url}` 
        })
        setSelectedFile(null)
        setTemplateId('')
        // Reset file input
        document.getElementById('file-input').value = ''
      } else if (res.status === 401) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in as admin.' })
      } else {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }))
        setMessage({ type: 'error', text: error.detail || 'Upload failed' })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setMessage({ type: 'error', text: 'Failed to upload file' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Asset Upload</h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Upload images and logos for templates
      </p>

      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <form onSubmit={handleUpload}>
          {/* Template ID */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Template ID
            </label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Enter template UUID"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Asset Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Asset Type
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            >
              <option value="logo">Logo</option>
              <option value="image">Image</option>
              <option value="icon">Icon</option>
            </select>
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select File
            </label>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Allowed: PNG, JPEG, GIF, SVG, WebP (max 5MB)
            </p>
          </div>

          {/* File Preview */}
          {selectedFile && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Preview
              </label>
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}>
                <div><strong>File:</strong> {selectedFile.name}</div>
                <div><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</div>
                <div><strong>Type:</strong> {selectedFile.type}</div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div style={{
              padding: '1rem',
              backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#d32f2f',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !selectedFile || !templateId}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: (uploading || !selectedFile || !templateId) ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (uploading || !selectedFile || !templateId) ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
      </div>

      {/* Security Notice */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        backgroundColor: '#fff3e0',
        borderRadius: '8px',
        fontSize: '0.9rem'
      }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>🔒 Security Notes</h3>
        <ul style={{ marginLeft: '1.5rem', color: '#666' }}>
          <li>Only image files are accepted (PNG, JPEG, GIF, SVG, WebP)</li>
          <li>Maximum file size: 5MB</li>
          <li>Files are scanned for malicious content</li>
          <li>Executable files are automatically rejected</li>
          <li>All uploads are logged for audit purposes</li>
        </ul>
      </div>
    </div>
  )
}