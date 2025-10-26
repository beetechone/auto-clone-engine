import { useState } from 'react'

export default function Editor() {
  const [qrData, setQrData] = useState('')
  const [qrType, setQrType] = useState('url')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>QR Code Editor</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Create and customize your QR codes
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Editor Form */}
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>QR Code Settings</h2>
          
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
              cursor: loading || !qrData.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Generating...' : 'Generate QR Code'}
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
  )
}
