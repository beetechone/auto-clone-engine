export default function Templates() {
  const templates = [
    { id: 1, name: 'Business Card', description: 'Professional vCard template', category: 'business' },
    { id: 2, name: 'Website URL', description: 'Simple URL QR code', category: 'general' },
    { id: 3, name: 'Wi-Fi Access', description: 'Network credentials', category: 'network' },
    { id: 4, name: 'Event Invite', description: 'Calendar event details', category: 'event' },
    { id: 5, name: 'Social Media', description: 'Link to social profiles', category: 'social' },
    { id: 6, name: 'Product Info', description: 'Product details and links', category: 'business' }
  ]

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>QR Code Templates</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Choose a pre-configured template to get started quickly
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {templates.map(template => (
          <div
            key={template.id}
            style={{
              padding: '1.5rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#fff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0070f3'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,112,243,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ddd'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: '100%',
              height: '150px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{ color: '#999', fontSize: '0.875rem' }}>Preview</span>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {template.name}
            </h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {template.description}
            </p>
            
            <button
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => {
                window.location.href = `/editor?template=${template.id}`
              }}
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
