import { useState, useEffect } from 'react'

export default function Home() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    fetch(`${apiBase}/billing/plans`)
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>QR Generator Clone</h1>
      
      <section style={{ marginTop: '2rem', padding: '1rem', border: '2px dashed #ccc', borderRadius: '8px' }}>
        <h2>QR Editor (Placeholder)</h2>
        <p>This is a placeholder for the QR code editor. In Phase 2, this will include:</p>
        <ul>
          <li>Input for URL/text/Wi-Fi/vCard/Event</li>
          <li>Style customization options</li>
          <li>Preview of QR code</li>
          <li>Export to PNG/SVG</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Billing Plans</h2>
        {loading && <p>Loading plans...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ 
                padding: '1rem', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                backgroundColor: plan.id === 'free' ? '#f0f9ff' : '#fff'
              }}>
                <h3>{plan.name}</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  ${(plan.price / 100).toFixed(2)}
                  {plan.interval && <span style={{ fontSize: '1rem' }}>/{plan.interval}</span>}
                </p>
                <p>QR/month: {plan.quota?.qr_month || 0}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
