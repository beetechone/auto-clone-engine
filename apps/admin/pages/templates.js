import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, published, unpublished
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)

  useEffect(() => {
    fetchCategories()
    fetchTemplates()
  }, [filter])

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
      // Note: In production, this would require auth token
      let url = `${API_BASE}/admin/templates?per_page=50`
      if (filter !== 'all') {
        url += `&is_published=${filter === 'published'}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      } else if (res.status === 401) {
        setError('Authentication required. Please log in as admin.')
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

  const handlePublish = async (templateId, currentStatus) => {
    try {
      const endpoint = currentStatus ? 'unpublish' : 'publish'
      const res = await fetch(`${API_BASE}/admin/templates/${templateId}/${endpoint}`, {
        method: 'POST'
      })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (err) {
      console.error('Error toggling publish status:', err)
    }
  }

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const res = await fetch(`${API_BASE}/admin/templates/${templateId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (err) {
      console.error('Error deleting template:', err)
    }
  }

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'Uncategorized'
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Template Management</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Manage QR code templates, categories, and assets
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + New Template
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid #f0f0f0' }}>
        {['all', 'published', 'unpublished'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: filter === f ? '#0070f3' : '#666',
              fontWeight: filter === f ? '600' : '400',
              borderBottom: filter === f ? '2px solid #0070f3' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading/Error states */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading templates...
        </div>
      )}

      {error && !loading && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          {error}
        </div>
      )}

      {/* Templates table */}
      {!loading && !error && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No templates found. Create your first template to get started.
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f5f5f5' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Category</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{template.name}</div>
                    {template.description && (
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                        {template.description.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {getCategoryName(template.category_id)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                    {template.type}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: template.is_published ? '#e8f5e9' : '#fff3e0',
                      color: template.is_published ? '#2e7d32' : '#ef6c00'
                    }}>
                      {template.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    {new Date(template.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingTemplate(template)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f5f5f5',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublish(template.id, template.is_published)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: template.is_published ? '#fff3e0' : '#e8f5e9',
                          color: template.is_published ? '#ef6c00' : '#2e7d32',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        {template.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#ffebee',
                          color: '#d32f2f',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingTemplate) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '1.5rem' }}>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Template creation form would go here. This is a placeholder for the full implementation.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingTemplate(null)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f5f5f5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}