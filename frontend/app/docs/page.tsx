"use client"

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight, Zap, Image, Video, Key, CreditCard, Box, FileText, AlertTriangle, Info, Sparkles, Clapperboard } from 'lucide-react'
import { IMAGE_MODELS, VIDEO_MODELS, ModelConfig } from '@/lib/models-config'
import { NEXT_PUBLIC_API } from '@/lib/config'

// --- Components ---

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
}

function CodeBlock({ code, language = 'bash', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-[#0d1117] my-4 shadow-sm">
      {title && (
        <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50 text-xs text-gray-400 font-mono">
          {title}
        </div>
      )}
      <div className="relative group">
        <div className="absolute top-2 right-2 flex gap-2">
            <span className="text-xs text-gray-500 font-mono px-2 py-1 select-none">{language}</span>
            <button
                onClick={handleCopy}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors border border-gray-700"
                title="Copy to clipboard"
            >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
        <pre className="p-4 text-sm overflow-x-auto text-gray-300 font-mono leading-relaxed pb-8">
          <code>{code}</code>
        </pre>
      </div>
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
    GET: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    POST: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    DELETE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-6 overflow-hidden shadow-sm bg-white dark:bg-gray-800/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className={`shrink-0 px-3 py-1 rounded text-xs font-bold border ${methodColors[method]}`}>
          {method}
        </div>
        <code className="text-sm font-mono text-gray-700 dark:text-gray-200 font-semibold truncate flex-1">
          {path}
        </code>
        <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:block shrink-0">
          {description}
        </span>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          {children}
        </div>
      )}
    </div>
  )
}

interface ParameterTableProps {
    params: { name: string; type: string; required: boolean; description: string }[]
    title?: string
}

function ParameterTable({ params, title = "Parameters" }: ParameterTableProps) {
    return (
        <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                        <tr>
                            <th className="px-4 py-2 border-b dark:border-gray-700 w-1/4">Name</th>
                            <th className="px-4 py-2 border-b dark:border-gray-700 w-1/6">Type</th>
                            <th className="px-4 py-2 border-b dark:border-gray-700 w-1/6">Required</th>
                            <th className="px-4 py-2 border-b dark:border-gray-700">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/50">
                        {params.map((p, i) => (
                            <tr key={i}>
                                <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.type}</td>
                                <td className="px-4 py-3">
                                    {p.required ? (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium dark:bg-red-900/30 dark:text-red-400">Required</span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Optional</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

interface InteractiveModelEndpointProps {
  title: string
  method: 'POST'
  path: string
  description: string
  models: ModelConfig[]
  defaultModelId: string
  type: 'image' | 'video'
}

function InteractiveModelEndpoint({ title, method, path, description, models, defaultModelId, type }: InteractiveModelEndpointProps) {
  const [selectedModelId, setSelectedModelId] = useState(defaultModelId)
  const selectedModel = models.find(m => m.value === selectedModelId) || models[0]

  // Dynamic Parameters
  const getParams = () => {
    const baseParams = [
      { name: "prompt", type: "string", required: true, description: "Text description of the desired content." },
      { name: "model", type: "string", required: true, description: `Selected model ID: '${selectedModel.value}'` },
    ]

    // API-specific dynamic params
    if (type === 'image') {
       if (selectedModel.resolutions) {
         baseParams.push({ 
           name: "resolution", 
           type: "string", 
           required: false, 
           description: `Allowed: ${selectedModel.resolutions.map(r => `'${r}'`).join(', ')}. Default: '${selectedModel.resolutions[1] || selectedModel.resolutions[0]}'` 
         })
       }
       if (selectedModel.aspectRatios) {
         baseParams.push({
           name: "aspect_ratio",
           type: "string",
           required: false,
           description: `Allowed: ${selectedModel.aspectRatios.map(r => `'${r}'`).join(', ')}. Default: '16:9'`
         })
       }
       if (selectedModel.speeds) {
          baseParams.push({
            name: "speed",
            type: "string",
            required: false,
            description: `Allowed: ${selectedModel.speeds.map(s => `'${s}'`).join(', ')}. Default: 'fast'`
          })
       }
        baseParams.push({ name: "input_image", type: "file", required: false, description: "For Image-to-Image (I2I)." })
    }

    if (type === 'video') {
       baseParams.push({ name: "mode", type: "string", required: false, description: "'t2v' (Text-to-Video) or 'i2v' (Image-to-Video)." })
       
       if (selectedModel.durations) {
         baseParams.push({
            name: "duration",
            type: "string",
            required: false,
             description: `Allowed: ${selectedModel.durations.map(d => `'${d}'`).join(', ')}.`
         })
       }
       
       if (selectedModel.aspectRatios) {
          baseParams.push({
           name: "aspect_ratio",
           type: "string",
           required: false,
           description: `Allowed: ${selectedModel.aspectRatios.map(r => `'${r}'`).join(', ')}.`
         })
       }

       if (selectedModel.value.includes('kling')) {
          baseParams.push({ name: "img_id", type: "string", required: false, description: "Recommended for Kling I2I. Returns from /files/upload/kling." })
       }
       if (selectedModel.value.includes('veo')) {
          baseParams.push({ name: "media_id", type: "string", required: false, description: "Required for Veo I2I. Returns from /files/upload/veo." })
       }
    }

    return baseParams
  }

  // Dynamic Code Example
  const getCode = () => {
    // Determine the base URL without /v1 suffix if it's already included (it shouldn't be per config.ts, but safety first)
    const baseUrl = NEXT_PUBLIC_API.endsWith('/') ? NEXT_PUBLIC_API.slice(0, -1) : NEXT_PUBLIC_API;
    // Construct full URL. Example: http://localhost:8000/v1/image/generate
    // Note: NEXT_PUBLIC_API usually includes /v1 if configured that way, but let's assume it's the host:port based on config.ts default.
    // However, config.ts says "http://localhost:8000". The paths in this file are like "/image/generate".
    // We need to ensure /v1 is present.
    // Let's assume NEXT_PUBLIC_API is the ROOT URL.
    
    // In config.ts: export const NEXT_PUBLIC_API = process.env.NEXT_PUBLIC_API || "http://localhost:8000";
    // We want: http://localhost:8000/v1/image/generate
    let apiUrl = baseUrl;
    if (!apiUrl.includes('/v1')) {
        apiUrl += '/v1';
    }

    let lines = [`curl -X ${method} ${apiUrl}${path} \\`,
      `  -H "Authorization: Bearer sk_live_your_key" \\`,
      `  -F "prompt=A cinematic shot..." \\`,
      `  -F "model=${selectedModel.value}"`]

    if (type === 'image') {
        if (selectedModel.resolutions) lines.push(`  -F "resolution=${selectedModel.resolutions[0]}" \\`)
        if (selectedModel.aspectRatios) lines.push(`  -F "aspect_ratio=16:9" \\`)
        if (selectedModel.speeds) lines.push(`  -F "speed=fast"`) // Default
    } else {
         if (selectedModel.durations) lines.push(`  -F "duration=${selectedModel.durations[0]}" \\`)
         lines.push(`  -F "aspect_ratio=16:9"`)
    }
    
    // clean up trailing slash on last line
    if (lines[lines.length-1].endsWith(' \\')) {
        lines[lines.length-1] = lines[lines.length-1].slice(0, -2)
    }
    
    return lines.join('\n')
  }

  return (
    <div className="mb-12">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
        {type === 'image' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />} {title}
      </h3>
      
      <Endpoint method={method} path={path} description={description}>
         <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Model to see params:</label>
            <div className="flex flex-wrap gap-2">
                {models.map(model => (
                    <button
                        key={model.value}
                        onClick={() => setSelectedModelId(model.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
                            ${selectedModelId === model.value 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}
                    >
                        {model.label}
                        {model.badge && <span className="bg-yellow-400 text-black text-[10px] px-1 rounded font-bold">{model.badge}</span>}
                    </button>
                ))}
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{selectedModel.description}</p>
         </div>

         <ParameterTable 
            title={`Parameters for ${selectedModel.label}`}
            params={getParams()}
         />

         <CodeBlock 
            title={`Example request for ${selectedModel.label}`}
            code={getCode()}
         />
         
         <CodeBlock 
             title="Response 200 OK" 
             language="json"
             code={`{
  "job_id": "job_123456789",
  "status": "pending",
  "cost": 10,
  "balance_remaining": 1490
}`} 
         />
      </Endpoint>
    </div>
  )
}

// --- Main Page ---

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Header */}
        <div className="mb-16 border-b border-gray-200 dark:border-gray-800 pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            API Documentation
            </h1>
        </div>

        {/* Quick Start */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold">Quick Start</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-lg mb-4">1. Get your API Key</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Sign up for an account and navigate to the Developer Dashboard to generate your secret API key.
                </p>
                <a href="/developers" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
                    Go to Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                </a>
            </div>
            
             <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-lg mb-4">2. Make your first request</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Use the `Authorization` header with all your requests.
                </p>
                <CodeBlock 
                    title="Example Request" 
                    code={`curl -X POST ${NEXT_PUBLIC_API}/v1/image/generate \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "prompt=A futuristic city" \\
  -F "model=nano-banana"`} 
                />
            </div>
          </div>
        </section>

        {/* Authentication & Base URL */}
        <section className="mb-20 grid md:grid-cols-2 gap-12">
            <div>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Authentication</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    The API uses Bearer Token authentication. Pass your API key in the `Authorization` header.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 mb-4">
                    <div className="flex gap-2">
                        <Info className="w-5 h-5 text-blue-500 shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Keep your API keys secure. Do not share them in client-side code (browsers, mobile apps).
                        </p>
                    </div>
                </div>
                <CodeBlock title="Header Format" code="Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx" />
            </div>

            <div>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Box className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Base URL</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    All API requests should be prefixed with the current version path.
                </p>
                <CodeBlock title="Current Version (v1)" code={`${NEXT_PUBLIC_API}/v1`} />
            </div>
        </section>

        {/* Endpoints */}
        <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">Endpoints</h2>
            </div>
            
            {/* Account */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <CreditCard className="w-4 h-4" /> Account
                </h3>
                
                <Endpoint method="GET" path="/balance" description="Retrieve current credit balance">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Returns details about the API key's associated account, including the remaining credit balance.
                    </p>
                    <CodeBlock 
                        title="Response 200 OK" 
                        language="json"
                        code={`{
  "balance": 1500,
  "currency": "credits",
  "key_prefix": "sk_live_abc",
  "organization": "My Organization"
}`} 
                    />
                </Endpoint>
            </div>

            {/* Models */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <Box className="w-4 h-4" /> Models
                </h3>
                
                <Endpoint method="GET" path="/models" description="List available models">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Retrieve a list of all available image and video generation models with their capabilities (aspect ratios, durations, etc.).
                    </p>
                    <CodeBlock 
                        title="Response 200 OK" 
                        language="json"
                        code={`{
  "data": [
    {
      "id": "nano-banana-pro",
      "name": "Nano Banana PRO",
      "type": "image",
      "description": "Google Nano Banana PRO Version",
      "provider": "Higgsfield",
      "badge": "HOT",
      "capabilities": {
        "aspect_ratios": ["auto", "1:1", "16:9", ...],
        "resolutions": ["1k", "2k", "4k"]
      }
    },
    {
      "id": "kling-2.6",
      "name": "Kling 2.6",
      "type": "video",
      "description": "Flagship model with Audio",
      "provider": "Kling",
      "capabilities": {
        "durations": ["5s", "10s"],
        "audio": true
      }
    }
  ]
}`} 
                    />
                </Endpoint>
            </div>

            {/* Image Generation */}
            <InteractiveModelEndpoint 
                title="Image Generation"
                method="POST"
                path="/image/generate"
                description="Create a new image generation job"
                models={IMAGE_MODELS}
                defaultModelId="nano-banana-pro"
                type="image"
            />

            {/* Video Generation */}
            <InteractiveModelEndpoint 
                title="Video Generation"
                method="POST"
                path="/video/generate"
                description="Create a video generation job"
                models={VIDEO_MODELS}
                defaultModelId="kling-2.6"
                type="video"
            />

            {/* File Uploads */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <FileText className="w-4 h-4" /> File Uploads
                </h3>
                
                <Endpoint method="POST" path="/files/upload/kling" description="Upload image for Kling I2V">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upload an image to be used with Kling models. Returns an ID and URL.
                    </p>
                    <CodeBlock 
                        title="Response 200 OK" 
                        language="json"
                        code={`{
  "id": "img_abc123",
  "url": "https://...",
  "width": 1024,
  "height": 576
}`} 
                    />
                </Endpoint>

                <Endpoint method="POST" path="/files/upload/veo" description="Upload image for Veo I2V">
                     <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upload an image to be used with Google Veo models. Returns a media_id.
                    </p>
                    <CodeBlock 
                        title="Response 200 OK" 
                        language="json"
                        code={`{
  "media_id": "CAMaJDNiNT..."
}`} 
                    />
                </Endpoint>
            </div>

            {/* Utility / Files */}
             <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <Info className="w-4 h-4" /> Validations & Status
                </h3>
                
                <Endpoint method="GET" path="/jobs/{job_id}" description="Poll job status">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Retrieve the status and result of a background job.
                    </p>
                    <CodeBlock title="Response (Processing)" language="json" code={`{ "status": "processing", "result": null }`} />
                     <CodeBlock title="Response (Completed)" language="json" code={`{ 
  "status": "completed", 
  "result": "https://storage.googleapis.com/.../video.mp4" 
}`} />
                </Endpoint>
            </div>
        </section>

        {/* Error Codes */}
        <section className="mb-20">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold">Error Codes</h2>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <table className="w-full text-sm text-left">
                     <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                        <tr>
                            <th className="px-6 py-4 border-b dark:border-gray-700 w-24">Code</th>
                            <th className="px-6 py-4 border-b dark:border-gray-700 w-1/4">Error</th>
                            <th className="px-6 py-4 border-b dark:border-gray-700">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">400</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Bad Request</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Missing parameters, invalid file format, or malformed request.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">401</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Unauthorized</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Invalid or missing API key.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">402</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Insufficient Funds</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Account balance is too low for this request. Recharge in Dashboard.</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">403</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Forbidden</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">API key does not have permission for this resource.</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">404</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Not Found</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">The requested job ID or resource does not exist.</td>
                        </tr>
                          <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">429</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Too Many Requests</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Rate limit exceeded (1000 requests per minute).</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">500</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Internal Server Error</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Something went wrong on our end. Please report this to support.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">503</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Service Unavailable</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">The AI model provider is currently overloaded or down for maintenance.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-500 text-sm border-t border-gray-200 dark:border-gray-800 pt-12">
            <p className="mb-2">Need help integration? Contact us at Zalo 0352143210.</p>
            <a href="mailto:leductummo@gmail.com" className="text-blue-600 hover:underline font-medium">leductummo@gmail.com</a>
        </div>
      </div>
    </div>
  )
}
