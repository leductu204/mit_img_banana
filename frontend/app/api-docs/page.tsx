"use client"

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight, Zap, Image, Video, Key, CreditCard } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
}

function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}

interface EndpointProps {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  description: string
  children: React.ReactNode
}

function Endpoint({ method, path, description, children }: EndpointProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const methodColors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    DELETE: 'bg-red-500'
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        <span className={`${methodColors[method]} text-white text-xs font-bold px-2 py-1 rounded`}>
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
        <span className="text-gray-500 text-sm ml-auto">{description}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {children}
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            API Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Integrate AI image and video generation into your applications
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Quick Start
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              All API requests require authentication using a Bearer token. Get your API key from the{' '}
              <a href="/developers" className="text-purple-600 hover:underline">Developer Dashboard</a>.
            </p>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/v1/video/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -F "prompt=A cat running in a sunny field" \\
  -F "model=kling-2.6" \\
  -F "mode=t2v"`} />
          </div>
        </section>

        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Base URL</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <CodeBlock code="https://api.tramsangtao.com/v1" />
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Key className="w-6 h-6 text-purple-500" />
            Authentication
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Include your API key in the <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Authorization</code> header:
            </p>
            <CodeBlock code={`Authorization: Bearer your_api_key_here`} />
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Endpoints</h2>

          {/* Balance */}
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 mt-8">
            <CreditCard className="w-5 h-5 text-green-500" />
            Account
          </h3>
          
          <Endpoint method="GET" path="/balance" description="Check API key balance">
            <p className="mb-3 text-gray-600 dark:text-gray-400">Returns the current credit balance for your API key.</p>
            <h4 className="font-semibold mb-2">Response</h4>
            <CodeBlock code={`{
  "balance": 150,
  "key_prefix": "sk_live_abc",
  "created_at": "2024-01-15T10:30:00Z"
}`} language="json" />
          </Endpoint>

          {/* Image Generation */}
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 mt-8">
            <Image className="w-5 h-5 text-blue-500" />
            Image Generation
          </h3>

          <Endpoint method="POST" path="/image/generate" description="Generate an image">
            <p className="mb-3 text-gray-600 dark:text-gray-400">Generate an image using AI models.</p>
            
            <h4 className="font-semibold mb-2">Parameters (form-data)</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Required</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>prompt</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">Yes</td>
                    <td className="p-2">Text description of the image</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>model</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">nano-banana, nano-banana-pro (default)</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>resolution</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">1k, 2k (default), 4k</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>aspect_ratio</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">1:1, 16:9 (default), 9:16, 4:3, 3:4</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-2">Example</h4>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/v1/image/generate \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F "prompt=A beautiful sunset over mountains" \\
  -F "model=nano-banana-pro" \\
  -F "resolution=2k" \\
  -F "aspect_ratio=16:9"`} />

            <h4 className="font-semibold mb-2 mt-4">Response</h4>
            <CodeBlock code={`{
  "job_id": "abc123-def456",
  "status": "pending",
  "cost": 6,
  "balance_remaining": 144
}`} language="json" />
          </Endpoint>

          {/* Video Generation */}
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 mt-8">
            <Video className="w-5 h-5 text-red-500" />
            Video Generation
          </h3>

          <Endpoint method="POST" path="/video/generate" description="Generate a video">
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              Generate a video using AI models. <br />
              <span className="text-sm">
                <strong>Veo Models:</strong> Fixed 8s duration.<br />
                <strong>Kling Models:</strong> Configurable duration (5s/10s) and resolution (720p/1080p).
              </span>
            </p>
            
            <h4 className="font-semibold mb-2">Parameters (form-data)</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Required</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>prompt</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">Yes</td>
                    <td className="p-2">Text description of the video</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>model</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">See models table below</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>mode</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">t2v (default), i2v</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>aspect_ratio</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">No</td>
                    <td className="p-2">9:16 (default), 16:9</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>duration</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">For Kling</td>
                    <td className="p-2">5s, 10s (Kling only). Veo is fixed 8s.</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>resolution</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">For Kling</td>
                    <td className="p-2">720p, 1080p </td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>img_url</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">For Kling I2V</td>
                    <td className="p-2">Image URL from /files/upload/kling</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>img_id</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">For Kling I2V</td>
                    <td className="p-2">Image ID from /files/upload/kling</td>
                  </tr>
                  <tr>
                    <td className="p-2"><code>media_id</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">For Veo I2V</td>
                    <td className="p-2">Media ID from /files/upload/veo</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-2">Available Models</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">T2V</th>
                    <th className="text-left p-2">I2V</th>
                    <th className="text-left p-2">Duration</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>kling-2.5-turbo</code></td>
                    <td className="p-2">❌</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">5s / 10s</td>
                    <td className="p-2">Fast I2V only</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>kling-o1-video</code></td>
                    <td className="p-2">❌</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">5s / 10s</td>
                    <td className="p-2">High quality I2V only</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>kling-2.6</code></td>
                    <td className="p-2">✅</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">5s / 10s</td>
                    <td className="p-2">Flagship model with audio</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>veo3.1-low</code></td>
                    <td className="p-2">✅</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">8s</td>
                    <td className="p-2">Google Veo - Economy</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>veo3.1-fast</code></td>
                    <td className="p-2">✅</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">8s</td>
                    <td className="p-2">Google Veo - Fast</td>
                  </tr>
                  <tr>
                    <td className="p-2"><code>veo3.1-high</code></td>
                    <td className="p-2">✅</td>
                    <td className="p-2">✅</td>
                    <td className="p-2">8s</td>
                    <td className="p-2">Google Veo - High Quality</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-2">Example (Text to Video)</h4>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/v1/video/generate \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F "prompt=A cat running in a sunny field" \\
  -F "model=kling-2.6" \\
  -F "mode=t2v" \\
  -F "aspect_ratio=16:9"`} />

            <h4 className="font-semibold mb-2 mt-8">Example (Image to Video - Veo)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">First upload image via <code>/files/upload/veo</code> to get a <code>media_id</code>.</p>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/v1/video/generate \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F "prompt=Animate the water flowing" \\
  -F "model=veo3.1-high" \\
  -F "mode=i2v" \\
  -F "media_id=CAMaJDNiNTdl..."`} />

            <h4 className="font-semibold mb-2 mt-4">Response</h4>
            <CodeBlock code={`{
  "job_id": "xyz789-abc123",
  "status": "pending",
  "cost": 50,
  "balance_remaining": 100
}`} language="json" />
          </Endpoint>

          {/* File Upload */}
          <Endpoint method="POST" path="/files/upload/kling" description="Upload image for Kling I2V">
            <p className="mb-3 text-gray-600 dark:text-gray-400">Upload an image to use with Kling I2V models.</p>
            
            <h4 className="font-semibold mb-2">Parameters (multipart/form-data)</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2"><code>file</code></td>
                    <td className="p-2">file</td>
                    <td className="p-2">Image file (JPEG, PNG)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-2">Example</h4>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/files/upload/kling \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F "file=@image.jpg"`} />

            <h4 className="font-semibold mb-2 mt-4">Response</h4>
            <CodeBlock code={`{
  "id": "abc123-def456",
  "url": "https://cdn.example.com/image.jpg",
  "width": 1024,
  "height": 1024
}`} language="json" />
          </Endpoint>

          <Endpoint method="POST" path="/files/upload/veo" description="Upload image for Veo I2V">
            <p className="mb-3 text-gray-600 dark:text-gray-400">Upload an image to use with Google Veo I2V models.</p>
            
            <h4 className="font-semibold mb-2">Parameters (multipart/form-data)</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="p-2"><code>file</code></td>
                    <td className="p-2">file</td>
                    <td className="p-2">Image file (JPEG, PNG)</td>
                  </tr>
                  <tr>
                    <td className="p-2"><code>aspect_ratio</code></td>
                    <td className="p-2">string</td>
                    <td className="p-2">9:16 (default), 16:9</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-2">Example</h4>
            <CodeBlock code={`curl -X POST https://api.tramsangtao.com/files/upload/veo \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F "file=@image.jpg" \\
  -F "aspect_ratio=9:16"`} />

            <h4 className="font-semibold mb-2 mt-4">Response</h4>
            <CodeBlock code={`{
  "media_id": "CAMaJDNiNTdlMGFlLTIx..."
}`} language="json" />
          </Endpoint>

          {/* Job Status */}
          <Endpoint method="GET" path="/jobs/{job_id}" description="Check job status">
            <p className="mb-3 text-gray-600 dark:text-gray-400">Check the status of a generation job and get the result when complete.</p>
            
            <h4 className="font-semibold mb-2">Example</h4>
            <CodeBlock code={`curl -X GET https://api.tramsangtao.com/jobs/abc123-def456 \\
  -H "Authorization: Bearer sk_live_xxx"`} />

            <h4 className="font-semibold mb-2 mt-4">Response (Pending)</h4>
            <CodeBlock code={`{
  "status": "processing",
  "result": null
}`} language="json" />

            <h4 className="font-semibold mb-2 mt-4">Response (Complete)</h4>
            <CodeBlock code={`{
  "status": "completed",
  "result": "https://cdn.example.com/video.mp4"
}`} language="json" />

            <h4 className="font-semibold mb-2 mt-4">Response (Failed)</h4>
            <CodeBlock code={`{
  "status": "failed: Server timeout",
  "result": null
}`} language="json" />
          </Endpoint>
        </section>

        {/* Error Codes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Error Codes</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b dark:border-gray-700">
                  <td className="p-2"><code>401</code></td>
                  <td className="p-2">Invalid or missing API key</td>
                </tr>
                <tr className="border-b dark:border-gray-700">
                  <td className="p-2"><code>402</code></td>
                  <td className="p-2">Insufficient balance</td>
                </tr>
                <tr className="border-b dark:border-gray-700">
                  <td className="p-2"><code>429</code></td>
                  <td className="p-2">Rate limit exceeded (100 req/min)</td>
                </tr>
                <tr>
                  <td className="p-2"><code>500</code></td>
                  <td className="p-2">Server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Need help? Contact support@tramsangtao.com</p>
        </div>
      </div>
    </div>
  )
}
