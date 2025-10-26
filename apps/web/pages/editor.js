import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Editor() {
  const router = useRouter()
  const { edit } = router.query

  const [qrName, setQrName] = useState('')
  const [qrData, setQrData] = useState('')
  const [qrType, setQrType] = useState('url')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editItemId, setEditItemId] = useState(null)

  useEffect(() => {
    if (edit) {
      setEditItemId(edit)
      loadQRItem(edit)
    }
  }, [edit])

  const loadQRItem = async (id) => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${apiBase}/library/qr-items/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQrName(data.name)
        setQrType(data.type)
        setQrData(JSON.stringify(data.payload))
        setQrCode({ ...data, placeholder: true })
      }
    } catch (err) {
      console.log('Failed to load QR item:', err.message)
    }
  }

  const handleGenerate = async () => {
    if (!qrData.trim()) return
    
    setLoading(true)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      // Stub API call - /qr endpoint may not exist yet
      const response = await fetch(`${apiBase}/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: qrData, 
          type: qrType 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setQrCode(data)
      }
    } catch (err) {
      console.log('QR API stub - not yet implemented:', err.message)
      // Show placeholder instead
      setQrCode({ 
        placeholder: true, 
        data: qrData, 
        type: qrType 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!qrName.trim()) {
      alert('Please enter a name for your QR code')
      return
    }
    if (!qrData.trim()) {
      alert('Please enter content for your QR code')
      return
    }

    setSaving(true)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      let payload
      try {
        payload = JSON.parse(qrData)
      } catch {
        // If not JSON, treat as simple string value
        payload = { value: qrData }
      }

      const body = {
        name: qrName,
        type: qrType,
        payload: payload,
        options: {}
      }

      const url = editItemId 
        ? `${apiBase}/library/qr-items/${editItemId}`
        : `${apiBase}/library/qr-items`
      
      const method = editItemId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        },
        body: JSON.stringify(body)
      })

      if (response.status === 401) {
        alert('Please log in to save QR codes')
        router.push('/login')
        return
      }

      if (response.ok || response.status === 201) {
        alert(editItemId ? 'QR code updated successfully!' : 'QR code saved successfully!')
        router.push('/dashboard')
      } else {
        alert('Failed to save QR code')
      }
    } catch (err) {
      console.log('Failed to save:', err.message)
      alert('Failed to save QR code: API not available')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Head>
        <title>{editItemId ? 'Edit' : 'Create'} QR Code - QR Editor</title>
        <meta name="description" content="Create and customize your QR codes" />
      </Head>

      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>QR Code Editor</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          {editItemId ? 'Edit your QR code' : 'Create and customize your QR codes'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Editor Form */}
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>QR Code Settings</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Name
              </label>
              <input
                type="text"
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                placeholder="My QR Code"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Type
              </label>
              <select
                value={qrType}
                onChange={(e) => setQrType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="url">URL</option>
                <option value="text">Text</option>
                <option value="wifi">Wi-Fi</option>
                <option value="vcard">vCard</option>
                <option value="event">Event</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Content
              </label>
              <textarea
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Enter URL, text, or data for QR code..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !qrData.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: loading || !qrData.trim() ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !qrData.trim() ? 'not-allowed' : 'pointer',
                marginBottom: '0.5rem'
              }}
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !qrName.trim() || !qrData.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: saving || !qrName.trim() || !qrData.trim() ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: saving || !qrName.trim() || !qrData.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : (editItemId ? 'Update QR Code' : 'Save to Library')}
            </button>
          </div>

          {/* Preview Panel */}
          <div style={{ 
            padding: '1.5rem', 
            border: '2px dashed #ddd', 
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Live Preview</h2>
            
            {qrCode ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '200px',
                  height: '200px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>
                    QR Code Preview<br/>
                    {qrCode.placeholder && '(Stub - API not yet implemented)'}
                  </p>
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      marginRight: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    Export PNG
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Export SVG
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: '#999', textAlign: 'center' }}>
                Enter content and click "Generate QR Code" to see preview
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
