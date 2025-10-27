export default function Admin() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>QR Generator - Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '3rem' }}>
        Manage templates, categories, and assets
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem' 
      }}>
        {/* Templates Card */}
        <a
          href="/templates"
          style={{
            display: 'block',
            padding: '2rem',
            backgroundColor: 'white',
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0070f3'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,112,243,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e0e0e0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Templates</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Manage QR code templates, publish/unpublish, and organize by categories
          </p>
        </a>

        {/* Uploads Card */}
        <a
          href="/uploads"
          style={{
            display: 'block',
            padding: '2rem',
            backgroundColor: 'white',
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0070f3'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,112,243,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e0e0e0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📤</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Uploads</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Upload and manage template assets (logos, images, icons) to S3/MinIO
          </p>
        </a>

        {/* Categories Card (Future) */}
        <div
          style={{
            padding: '2rem',
            backgroundColor: '#f5f5f5',
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            opacity: 0.6
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏷️</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Categories</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Coming soon: Manage template categories
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div style={{ 
        marginTop: '3rem', 
        padding: '1.5rem', 
        backgroundColor: '#e3f2fd',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '0.5rem', color: '#1565c0' }}>ℹ️ Phase 4 Features</h3>
        <ul style={{ marginLeft: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
          <li>Template CRUD operations with publish/unpublish control</li>
          <li>Category management and organization</li>
          <li>Secure file uploads to S3/MinIO with validation</li>
          <li>Redis caching for improved performance</li>
          <li>Role-based access control (admin only)</li>
        </ul>
      </div>
    </div>
  )
}
