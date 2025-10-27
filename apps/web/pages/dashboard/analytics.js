import { useState, useEffect } from 'react'
import Head from 'next/head'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [period, setPeriod] = useState('daily')
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchAnalyticsSummary()
    fetchTimeSeriesData()
  }, [period, days])

  const fetchAnalyticsSummary = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${apiBase}/analytics/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
        }
      })

      if (response.status === 401) {
        setError('Please log in to view analytics')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setSummary(data)
        setError(null)
      } else {
        setError('Failed to load analytics')
      }
    } catch (err) {
      console.log('API not available, using placeholder data:', err.message)
      // Use placeholder data when API is not available
      setSummary({
        total_creates: 42,
        total_exports: 28,
        total_scans: 156,
        creates_this_week: 7,
        exports_this_week: 5,
        scans_this_week: 23,
        creates_this_month: 15,
        exports_this_month: 12,
        scans_this_month: 78
      })
    }
  }

  const fetchTimeSeriesData = async () => {
    setLoading(true)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
    try {
      const response = await fetch(
        `${apiBase}/analytics/timeseries?period=${period}&days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'guest-token'}`,
          }
        }
      )

      if (response.status === 401) {
        setError('Please log in to view analytics')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setTimeSeriesData(data.data || [])
        setError(null)
      } else {
        setError('Failed to load time series data')
      }
    } catch (err) {
      console.log('API not available, using placeholder data:', err.message)
      // Use placeholder data when API is not available
      setTimeSeriesData([
        { date: '2025-10-20', creates: 3, exports: 2, scans: 8 },
        { date: '2025-10-21', creates: 5, exports: 4, scans: 12 },
        { date: '2025-10-22', creates: 2, exports: 1, scans: 5 },
        { date: '2025-10-23', creates: 4, exports: 3, scans: 15 },
        { date: '2025-10-24', creates: 6, exports: 5, scans: 20 },
        { date: '2025-10-25', creates: 3, exports: 2, scans: 9 },
        { date: '2025-10-26', creates: 4, exports: 3, scans: 14 },
        { date: '2025-10-27', creates: 7, exports: 5, scans: 23 }
      ])
    }
    setLoading(false)
  }

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
  }

  const handleDaysChange = (newDays) => {
    setDays(newDays)
  }

  return (
    <>
      <Head>
        <title>Analytics | QR Cloner</title>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>My Dashboard</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>View your analytics and insights</p>
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

        {/* Dashboard Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          <a 
            href="/dashboard"
            style={{
              padding: '0.5rem 1rem',
              color: '#666',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Library
          </a>
          <a 
            href="/dashboard/analytics"
            style={{
              padding: '0.5rem 1rem',
              color: '#0070f3',
              textDecoration: 'none',
              fontWeight: '600',
              borderBottom: '2px solid #0070f3',
              marginBottom: '-2px'
            }}
          >
            Analytics
          </a>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem' 
          }}>
            <p style={{ color: '#c00', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '3rem' 
          }}>
            {/* Total Metrics */}
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb' 
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total QR Codes</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                {summary.total_creates}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                +{summary.creates_this_month} this month
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb' 
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Exports</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                {summary.total_exports}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                +{summary.exports_this_month} this month
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb' 
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Scans</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                {summary.total_scans}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                +{summary.scans_this_month} this month
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb' 
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>This Week</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  <span style={{ fontWeight: 'bold' }}>{summary.creates_this_week}</span> created
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  <span style={{ fontWeight: 'bold' }}>{summary.exports_this_week}</span> exported
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  <span style={{ fontWeight: 'bold' }}>{summary.scans_this_week}</span> scanned
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: '#6b7280', marginRight: '0.5rem' }}>Period:</label>
            <select 
              value={period} 
              onChange={(e) => handlePeriodChange(e.target.value)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: '#6b7280', marginRight: '0.5rem' }}>Days:</label>
            <select 
              value={days} 
              onChange={(e) => handleDaysChange(parseInt(e.target.value))}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Time Series Charts */}
        {!loading && timeSeriesData.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Activity Over Time
            </h2>
            
            {/* Line Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Events Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="creates" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Creates"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="exports" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Exports"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="scans" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Scans"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb' 
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Events Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="creates" fill="#3b82f6" name="Creates" />
                  <Bar dataKey="exports" fill="#10b981" name="Exports" />
                  <Bar dataKey="scans" fill="#f59e0b" name="Scans" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#6b7280' }}>Loading analytics data...</p>
          </div>
        )}

        {!loading && timeSeriesData.length === 0 && !error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              No data available yet
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Start creating and exporting QR codes to see analytics
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div style={{ 
          marginTop: '3rem',
          padding: '1.5rem',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af' }}>
            About Analytics
          </h3>
          <ul style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: '1.5', paddingLeft: '1.25rem' }}>
            <li><strong>Creates:</strong> Number of QR codes generated</li>
            <li><strong>Exports:</strong> Number of times QR codes were downloaded (PNG/SVG)</li>
            <li><strong>Scans:</strong> Number of times QR codes were scanned via shortlinks</li>
          </ul>
          <p style={{ fontSize: '0.875rem', color: '#1e3a8a', marginTop: '1rem', marginBottom: 0 }}>
            💡 Tip: Use shortlinks (/r/code) to track scans of your QR codes
          </p>
        </div>
      </div>
    </>
  )
}
