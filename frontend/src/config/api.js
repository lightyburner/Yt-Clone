export const API_URL =
  (import.meta.env.MODE === 'development')
    ? (import.meta.env.VITE_API_URL || 'http://localhost:3000')
    : (import.meta.env.VITE_API_URL || 'https://yt-clone-il3g.onrender.com')

// Debug logging for production
if (import.meta.env.PROD) {
  console.log('🔧 Production API URL:', API_URL)
  console.log('🔧 Environment variables:', {
    MODE: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  })
  
  // Force production URL if environment variable is not set
  if (!import.meta.env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set in environment, using fallback')
  }
}