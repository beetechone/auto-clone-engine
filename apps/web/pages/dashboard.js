import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Dashboard() {
  const [qrItems, setQrItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const perPage = 20

  useEffect(() => {
    fetchQRItems()
  }, [page, sortBy, sortOrder, search])

  const fetchQRItems = async () => {
    setLoading(true)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`${apiBase}/library/qr-items?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.status === 401) {
        // User not authenticated, show placeholder
        setError('Please log in to view your saved QR codes')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setQrItems(data.items || [])
        setTotal(data.total || 0)
        setError(null)
      } else {
        setError('Failed to load QR codes')
      }
    } catch (err) {
      console.log('API not available, using placeholder data:', err.message)
      // Use placeholder data when API is not available
      setQrItems([
        { id: '1', name: 'Company Website', type: 'url', created_at: '2025-10-20T00:00:00Z', scans: 42 },
        { id: '2', name: 'Business Card', type: 'vcard', created_at: '2025-10-18T00:00:00Z', scans: 15 },
        { id: '3', name: 'Product Page', type: 'url', created_at: '2025-10-15T00:00:00Z', scans: 28 }
      ])
      setTotal(3)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
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
        // Refresh list
        fetchQRItems()
      } else {
        alert('Failed to delete QR code')
      }
    } catch (err) {
      alert('Failed to delete QR code: API not available')
    }
  }

  const handleDuplicate = async (id) => {
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
        // Refresh list
        fetchQRItems()
      } else {
        alert('Failed to duplicate QR code')
      }
    } catch (err) {
      alert('Failed to duplicate QR code: API not available')
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  return (
    <>
      <Head>
        <title>My Dashboard - QR Code Library</title>
        <meta name="description" content="Manage your saved QR codes" />
      </Head>
      
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>My Dashboard</h1>
            <p style={{ color: '#666' }}>Manage your saved QR codes</p>
          </div>
          <button
            onClick={() => window.location.href = '/editor'}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create New QR
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search QR codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {error && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: '#856404'
          }}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading...
          </div>
        ) : qrItems.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <h2 style={{ color: '#666' }}>No QR codes yet</h2>
            <p style={{ color: '#999' }}>Create your first QR code to get started!</p>
            <button
              onClick={() => window.location.href = '/editor'}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create QR Code
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Saved QR Codes ({total})</h2>
            </div>
            
            <div style={{ 
              backgroundColor: '#f9f9f9', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Preview</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {qrItems.map(qr => (
                    <tr key={qr.id} style={{ borderTop: '1px solid #ddd' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#999' }}>QR</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>{qr.name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {qr.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#666' }}>{formatDate(qr.created_at)}</td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => window.location.href = `/dashboard/items/${qr.id}`}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#fff',
                            color: '#0070f3',
                            border: '1px solid #0070f3',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDuplicate(qr.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#fff',
                            color: '#28a745',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDelete(qr.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#fff',
                            color: '#dc3545',
                            border: '1px solid #dc3545',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > perPage && (
              <div style={{ 
                marginTop: '1.5rem', 
                display: 'flex', 
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: page === 1 ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
                  Page {page} of {Math.ceil(total / perPage)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / perPage)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: page >= Math.ceil(total / perPage) ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: page >= Math.ceil(total / perPage) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
