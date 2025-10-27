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
    const successUrl = `${window.location.origin}/dashboard?checkout=success`
    const cancelUrl = `${window.location.origin}/pricing?checkout=canceled`
    
    try {
      const response = await fetch(`${apiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // TODO: Add Authorization header with JWT token
        },
        body: JSON.stringify({ 
          plan_id: planId,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Failed to start checkout. Please try again.')
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Simple, Transparent Pricing</h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '0.5rem' }}>
          Choose the plan that's right for you
        </p>
        <p style={{ fontSize: '0.95rem', color: '#999' }}>
          All plans include unlimited customization and basic templates
        </p>
      </div>
      
      {loading && <p style={{ textAlign: 'center' }}>Loading plans...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
      
      {!loading && !error && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
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
                backgroundColor: plan.id === 'pro' ? '#f0f9ff' : '#fff',
                boxShadow: plan.id === 'pro' ? '0 8px 24px rgba(0,112,243,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {plan.id === 'pro' && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  POPULAR
                </div>
              )}
              
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {plan.name}
              </h3>
              
              <div style={{ margin: '1rem 0 1.5rem 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: '1' }}>
                  ${(plan.price / 100).toFixed(0)}
                </span>
                {plan.interval && (
                  <span style={{ fontSize: '1rem', color: '#666', fontWeight: 'normal' }}>
                    /{plan.interval}
                  </span>
                )}
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                {plan.features && plan.features.map((feature, idx) => (
                  <li key={idx} style={{ 
                    padding: '0.75rem 0', 
                    display: 'flex',
                    alignItems: 'flex-start',
                    fontSize: '0.95rem',
                    color: '#333'
                  }}>
                    <span style={{ 
                      color: '#0070f3', 
                      marginRight: '0.75rem',
                      fontSize: '1.2rem',
                      lineHeight: '1'
                    }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.id !== 'free' ? (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: plan.id === 'pro' ? '#0070f3' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginTop: 'auto'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Get Started
                </button>
              ) : (
                <button
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#fff',
                    color: '#666',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'default',
                    marginTop: 'auto'
                  }}
                >
                  Free Forever
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: '4rem', 
        padding: '2rem',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Frequently Asked Questions</h3>
        <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
          <details style={{ marginBottom: '1rem', padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              Can I upgrade or downgrade my plan anytime?
            </summary>
            <p style={{ marginTop: '0.75rem', color: '#666' }}>
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and we'll prorate the difference.
            </p>
          </details>
          
          <details style={{ marginBottom: '1rem', padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              What happens when I hit my quota limit?
            </summary>
            <p style={{ marginTop: '0.75rem', color: '#666' }}>
              You'll receive a notification when you approach your quota limit. You can upgrade 
              your plan to continue using the service without interruption.
            </p>
          </details>
          
          <details style={{ marginBottom: '1rem', padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              Do you offer refunds?
            </summary>
            <p style={{ marginTop: '0.75rem', color: '#666' }}>
              Yes, we offer a 30-day money-back guarantee on all paid plans. Contact our support 
              team for assistance.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
