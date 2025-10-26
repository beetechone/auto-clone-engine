export default function Dashboard() {
  // Placeholder saved QR codes
  const savedQRs = [
    { id: 1, name: 'Company Website', type: 'url', created: '2025-10-20', scans: 42 },
    { id: 2, name: 'Business Card', type: 'vcard', created: '2025-10-18', scans: 15 },
    { id: 3, name: 'Product Page', type: 'url', created: '2025-10-15', scans: 28 }
  ]

  return (
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

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Saved QR Codes</h2>
        
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Scans</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedQRs.map(qr => (
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
                  <td style={{ padding: '1rem', color: '#666' }}>{qr.created}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{qr.scans}</td>
                  <td style={{ padding: '1rem' }}>
                    <button
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
                      Edit
                    </button>
                    <button
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
      </div>

      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: '#f0f9ff', 
        border: '1px solid #bfdbfe',
        borderRadius: '8px' 
      }}>
        <p style={{ color: '#1e40af', margin: 0 }}>
          ℹ️ This is a placeholder dashboard. In Phase 3, saved QR codes will be stored in a database and linked to your account.
        </p>
      </div>
    </div>
  )
}
