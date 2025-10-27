import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchCategories()
    fetchTemplates()
  }, [selectedCategory, searchTerm, page])

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates/categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `${API_BASE}/templates?page=${page}&per_page=12`
      if (selectedCategory) url += `&category_id=${selectedCategory}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
        setTotal(data.total || 0)
      } else {
        setError('Failed to load templates')
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyTemplate = (template) => {
    // Store template data in sessionStorage for editor
    sessionStorage.setItem('appliedTemplate', JSON.stringify(template))
    window.location.href = `/editor?template=${template.id}`
  }

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'General'
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>QR Code Templates</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Choose a pre-configured template to get started quickly
      </p>

      {/* Filters */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setPage(1)
          }}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.9rem',
            minWidth: '150px'
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading templates...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      )}

      {/* Templates grid */}
      {!loading && !error && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No templates found. Try adjusting your filters.
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <>
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
                {/* Preview */}
                <div style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  overflow: 'hidden'
                }}>
                  {template.preview_url ? (
                    <img 
                      src={template.preview_url} 
                      alt={template.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.875rem' }}>Preview</span>
                  )}
                </div>
                
                {/* Category badge */}
                {template.category_id && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#0070f3',
                    marginBottom: '0.5rem',
                    fontWeight: '600'
                  }}>
                    {getCategoryName(template.category_id)}
                  </div>
                )}

                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  {template.name}
                </h3>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {template.description || 'No description'}
                </p>
                
                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          color: '#666'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

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
                  onClick={() => handleApplyTemplate(template)}
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div style={{ 
              marginTop: '2rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '1rem'
            }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page === 1 ? '#f5f5f5' : '#0070f3',
                  color: page === 1 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{ color: '#666' }}>
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 12)}
                onClick={() => setPage(page + 1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page >= Math.ceil(total / 12) ? '#f5f5f5' : '#0070f3',
                  color: page >= Math.ceil(total / 12) ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page >= Math.ceil(total / 12) ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
