import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import PostComposer from './PostComposer'

const Feed = () => {
	const { user } = useAuth()
	const [posts, setPosts] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		async function load() {
			setError('')
			setLoading(true)
			try {
				const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
				const res = await fetch(`${apiBase}/api/posts`)
				const data = await res.json()
				if (res.ok) setPosts(data.posts || [])  
				else setError(data.message || 'Failed to load feed')
			} catch {
				setError('Network error')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

	return (
		<div className="min-h-screen bg-gray-900 text-white px-4 py-6">
			<div className="max-w-2xl mx-auto space-y-4">
				<h1 className="text-2xl font-semibold">Feed</h1>
				{user && <PostComposer onPosted={(p) => setPosts(prev => [p, ...prev])} />}
				{loading && <p>Loading...</p>}
				{error && <p className="text-red-400">{error}</p>}
				{posts.map(p => (
					<div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
						<p className="text-gray-200 whitespace-pre-wrap">{p.content}</p>
						{p.video_url && (
							<div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center text-sm text-gray-400">
								Video preview coming soon
							</div>
						)}
						<div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default Feed


