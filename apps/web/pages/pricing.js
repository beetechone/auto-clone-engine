import { useState, useEffect } from 'react'

export default function Pricing() {
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

  const handleCheckout = async (planId) => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    try {
      const response = await fetch(`${apiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Pricing Plans</h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
        Choose the plan that's right for you
      </p>
      
      {loading && <p>Loading plans...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {!loading && !error && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          marginTop: '2rem'
        }}>
          {plans.map(plan => (
            <div 
              key={plan.id} 
              style={{ 
                padding: '2rem', 
                border: plan.id === 'pro' ? '2px solid #0070f3' : '1px solid #ddd', 
                borderRadius: '12px',
                backgroundColor: plan.id === 'free' ? '#f0f9ff' : '#fff',
                boxShadow: plan.id === 'pro' ? '0 4px 12px rgba(0,112,243,0.15)' : 'none'
              }}
            >
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' }}>
                ${(plan.price / 100).toFixed(2)}
                {plan.interval && <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/{plan.interval}</span>}
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0' }}>
                <li style={{ padding: '0.5rem 0' }}>
                  ✓ {plan.quota?.qr_month || 0} QR codes per month
                </li>
                <li style={{ padding: '0.5rem 0' }}>
                  ✓ {plan.features?.analytics ? 'Analytics included' : 'Basic features'}
                </li>
                <li style={{ padding: '0.5rem 0' }}>
                  ✓ {plan.features?.templates ? 'Premium templates' : 'Standard templates'}
                </li>
              </ul>
              
              {plan.id !== 'free' ? (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Go Pro
                </button>
              ) : (
                <button
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Current Plan
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
