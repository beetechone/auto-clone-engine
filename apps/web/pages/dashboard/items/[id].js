import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function QRItemDetail() {
  const router = useRouter()
  const { id } = router.query
  
  const [qrItem, setQrItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      fetchQRItem()
    }
  }, [id])

  const fetchQRItem = async () => {
    // Validate ID to prevent request forgery
    if (!id || typeof id !== 'string' || id.length > 100) {
      setError('Invalid QR code ID')
      setLoading(false)
      return
    }

    setLoading(true)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${apiBase}/library/qr-items/${encodeURIComponent(id)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.status === 401) {
        setError('Please log in to view this QR code')
        setLoading(false)
        return
      }

      if (response.status === 404) {
        setError('QR code not found')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setQrItem(data)
        setError(null)
      } else {
        setError('Failed to load QR code')
      }
    } catch (err) {
      console.log('API not available:', err.message)
      // Use placeholder data
      setQrItem({
        id: id,
        name: 'Sample QR Code',
        type: 'url',
        payload: { url: 'https://example.com' },
        options: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this QR code?')) return
    
    // Validate ID to prevent request forgery
    if (!id || typeof id !== 'string' || id.length > 100) {
      alert('Invalid QR code ID')
      return
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${apiBase}/library/qr-items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.ok || response.status === 204) {
        router.push('/dashboard')
      } else {
        alert('Failed to delete QR code')
      }
    } catch (err) {
      alert('Failed to delete QR code: API not available')
    }
  }

  const handleDuplicate = async () => {
    // Validate ID to prevent request forgery
    if (!id || typeof id !== 'string' || id.length > 100) {
      alert('Invalid QR code ID')
      return
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${apiBase}/library/qr-items/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.ok || response.status === 201) {
        const data = await response.json()
        router.push(`/dashboard/items/${data.id}`)
      } else {
        alert('Failed to duplicate QR code')
      }
    } catch (err) {
      alert('Failed to duplicate QR code: API not available')
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1>Loading...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Error - QR Code Not Found</title>
        </Head>
        <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            padding: '2rem', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#856404' }}>⚠️ {error}</h1>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!qrItem) {
    return null
  }

  return (
    <>
      <Head>
        <title>{qrItem.name} - QR Code Detail</title>
        <meta name="description" content={`View and manage ${qrItem.name}`} />
      </Head>
      
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              color: '#0070f3',
              border: '1px solid #0070f3',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>{qrItem.name}</h1>
              <p style={{ color: '#666' }}>
                Created: {formatDate(qrItem.created_at)}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => router.push(`/editor?edit=${id}`)}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
              <button
                onClick={handleDuplicate}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* QR Code Preview */}
          <div style={{ 
            padding: '2rem', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>QR Code</h2>
            <div style={{
              width: '300px',
              height: '300px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <p style={{ color: '#999', fontSize: '0.875rem' }}>
                QR Code Preview<br/>
                (Rendering not yet implemented)
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
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

          {/* Details */}
          <div style={{ 
            padding: '2rem', 
            border: '1px solid #ddd', 
            borderRadius: '8px'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Details</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                Type
              </label>
              <span style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                {qrItem.type}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                Content
              </label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9f9f9',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(qrItem.payload, null, 2)}
              </div>
            </div>

            {qrItem.tags && qrItem.tags.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Tags
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {qrItem.tags.map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: tag.color || '#0070f3',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                Last Updated
              </label>
              <p style={{ color: '#666', margin: 0 }}>{formatDate(qrItem.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
