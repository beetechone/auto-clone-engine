import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Canonical URL - prevents duplicate content issues */}
        <link rel="canonical" href="http://localhost:3000" />
        
        {/* Meta tags for SEO */}
        <meta name="description" content="Professional QR code generator with customization, analytics, and templates. Create QR codes for URLs, text, Wi-Fi, vCards, and events." />
        <meta name="keywords" content="QR code, QR generator, QR code maker, custom QR codes, QR analytics" />
        <meta name="author" content="QR Clone Engine" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph tags for social sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="QR Clone Engine - Professional QR Code Generator" />
        <meta property="og:description" content="Create custom QR codes with analytics, templates, and export options." />
        <meta property="og:url" content="http://localhost:3000" />
        <meta property="og:site_name" content="QR Clone Engine" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="QR Clone Engine - Professional QR Code Generator" />
        <meta name="twitter:description" content="Create custom QR codes with analytics, templates, and export options." />
        
        {/* Viewport for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#000000" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
