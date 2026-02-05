"use client"

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight, Zap, Image, Video, Key, CreditCard, Box, FileText, AlertTriangle, Info, Sparkles, Clapperboard } from 'lucide-react'
import { IMAGE_MODELS, VIDEO_MODELS, ModelConfig } from '@/lib/models-config'
import Header from "@/components/layout/Header"

const API_BASE_URL = "https://api.tramgsangtao.com"

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
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0d1117] my-4 shadow-sm">
      {title && (
        <div className="px-4 py-2 border-b border-white/10 bg-[#1a1f2e]/50 text-xs text-gray-400 font-mono">
          {title}
        </div>
      )}
      <div className="relative group">
        <div className="absolute top-2 right-2 flex gap-2">
            <span className="text-xs text-gray-500 font-mono px-2 py-1 select-none">{language}</span>
            <button
                onClick={handleCopy}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors border border-gray-700"
                title="Sao chép"
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
    GET: 'bg-green-900/30 text-green-400 border-green-800/50',
    POST: 'bg-[#00BCD4]/20 text-[#00BCD4] border-[#00BCD4]/50',
    DELETE: 'bg-red-900/30 text-red-400 border-red-800/50'
  }

  return (
    <div className="border border-white/10 rounded-lg mb-6 overflow-hidden shadow-sm bg-[#1a1f2e]/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-4 hover:bg-[#252D3D]/50 transition-colors text-left"
      >
        <div className={`shrink-0 px-3 py-1 rounded text-xs font-bold border ${methodColors[method]}`}>
          {method}
        </div>
        <code className="text-sm font-mono text-gray-200 font-semibold truncate flex-1">
          {path}
        </code>
        <span className="text-gray-400 text-sm hidden sm:block shrink-0">
          {description}
        </span>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-white/10 bg-[#0d1117]/50">
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

function ParameterTable({ params, title = "Tham số" }: ParameterTableProps) {
    return (
        <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
        <div className="overflow-x-auto border border-white/10 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#1a1f2e] text-gray-300 font-medium">
                        <tr>
                            <th className="px-4 py-2 border-b border-white/10 w-1/4">Tên</th>
                            <th className="px-4 py-2 border-b border-white/10 w-1/6">Loại</th>
                            <th className="px-4 py-2 border-b border-white/10 w-1/6">Bắt buộc</th>
                            <th className="px-4 py-2 border-b border-white/10">Mô tả</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-[#0d1117]/50">
                        {params.map((p, i) => (
                            <tr key={i}>
                                <td className="px-4 py-3 font-mono text-[#00BCD4]">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.type}</td>
                                <td className="px-4 py-3">
                                    {p.required ? (
                                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded font-medium">Bắt buộc</span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Tùy chọn</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-300">{p.description}</td>
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
      { name: "prompt", type: "string", required: true, description: "Mô tả văn bản nội dung mong muốn." },
      { name: "model", type: "string", required: true, description: `ID model đã chọn: '${selectedModel.value}'` },
    ]

    // API-specific dynamic params
    if (type === 'image') {
       if (selectedModel.resolutions) {
         baseParams.push({ 
           name: "resolution", 
           type: "string", 
           required: false, 
           description: `Cho phép: ${selectedModel.resolutions.map(r => `'${r}'`).join(', ')}. Mặc định: '${selectedModel.resolutions[1] || selectedModel.resolutions[0]}'` 
         })
       }
       if (selectedModel.aspectRatios) {
         baseParams.push({
           name: "aspect_ratio",
           type: "string",
           required: false,
           description: `Cho phép: ${selectedModel.aspectRatios.map(r => `'${r}'`).join(', ')}. Mặc định: '16:9'`
         })
       }
       if (selectedModel.speeds) {
          baseParams.push({
            name: "speed",
            type: "string",
            required: false,
            description: `Cho phép: ${selectedModel.speeds.map(s => `'${s}'`).join(', ')}. Mặc định: 'fast'`
          })
       }
        baseParams.push({ name: "input_image", type: "file", required: false, description: "Dành cho Image-to-Image (I2I)." })
    }

    if (type === 'video') {
       baseParams.push({ name: "mode", type: "string", required: false, description: "'t2v' (Text-to-Video) hoặc 'i2v' (Image-to-Video)." })
       
       if (selectedModel.durations) {
         baseParams.push({
            name: "duration",
            type: "string",
            required: false,
             description: `Cho phép: ${selectedModel.durations.map(d => `'${d}'`).join(', ')}.`
         })
       }
       
       if (selectedModel.aspectRatios) {
          baseParams.push({
           name: "aspect_ratio",
           type: "string",
           required: false,
           description: `Cho phép: ${selectedModel.aspectRatios.map(r => `'${r}'`).join(', ')}.`
         })
       }

       if (selectedModel.value.includes('kling')) {
          baseParams.push({ name: "img_id", type: "string", required: false, description: "Khuyên dùng cho Kling I2I. Trả về từ /files/upload/kling." })
       }
       if (selectedModel.value.includes('veo')) {
          baseParams.push({ name: "media_id", type: "string", required: false, description: "Bắt buộc cho Veo I2I. Trả về từ /files/upload/veo." })
       }
    }

    return baseParams
  }

  // Dynamic Code Example
  const getCode = () => {
    // Determine the base URL without /v1 suffix if it's already included (it shouldn't be per config.ts, but safety first)
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
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
         <div className="mb-8 p-4 bg-[#1a1f2e]/50 rounded-lg border border-white/10">
             <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Model để xem tham số:</label>
            <div className="flex flex-wrap gap-2">
                {models.map(model => (
                    <button
                        key={model.value}
                        onClick={() => setSelectedModelId(model.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
                            ${selectedModelId === model.value 
                                ? 'bg-[#00BCD4] text-black shadow-md shadow-[#00BCD4]/20' 
                                : 'bg-[#252D3D] text-gray-300 border border-white/10 hover:border-[#00BCD4]/50'}`}
                    >
                        {model.label}
                        {model.badge && <span className="bg-yellow-400 text-black text-[10px] px-1 rounded font-bold">{model.badge}</span>}
                    </button>
                ))}
            </div>
            <p className="mt-3 text-sm text-gray-400">{selectedModel.description}</p>
         </div>

         <ParameterTable 
            title={`Tham số cho ${selectedModel.label}`}
            params={getParams()}
         />

         <CodeBlock 
            title={`Ví dụ request cho ${selectedModel.label}`}
            code={getCode()}
         />
         
         <CodeBlock 
             title="Phản hồi 200 OK" 
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
    <div className="min-h-screen bg-[#0A0E13] text-gray-100">
      {/* Header Component */}
      <Header />
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Hero Header */}
        <div className="mb-16 border-b border-white/10 pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-[#00BCD4] via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Tài liệu API
            </h1>
        </div>

        {/* Quick Start */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#00BCD4]/20 rounded-lg">
                <Zap className="w-6 h-6 text-[#00BCD4]" />
              </div>
              <h2 className="text-2xl font-bold">Bắt đầu nhanh</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#1a1f2e]/50 rounded-xl p-8 border border-white/10">
                <h3 className="font-semibold text-lg mb-4 text-white">1. Lấy API Key của bạn</h3>
                <p className="text-gray-400 mb-4">
                    Truy cập Developer Dashboard để tạo API key.
                </p>
                <a href="/developers" className="inline-flex items-center text-sm font-medium text-[#00BCD4] hover:text-cyan-400">
                    Đến Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                </a>
            </div>
            
             <div className="bg-[#1a1f2e]/50 rounded-xl p-8 border border-white/10">
                <h3 className="font-semibold text-lg mb-4 text-white">2. Tạo request</h3>
                <p className="text-gray-400 mb-4">
                    Sử dụng Authorization header cho tất cả các request.
                </p>
                <CodeBlock 
                    title="Ví dụ Request" 
                    code={`curl -X POST ${API_BASE_URL}/v1/image/generate \\
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
                    <div className="p-2 bg-[#00BCD4]/20 rounded-lg">
                        <Key className="w-6 h-6 text-[#00BCD4]" />
                    </div>
                    <h2 className="text-2xl font-bold">Xác thực (Authentication)</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    API sử dụng xác thực Bearer Token. Truyền API key của bạn trong Authorization header.
                </p>
                <div className="bg-[#00BCD4]/10 border border-[#00BCD4]/30 rounded-lg p-4 mb-4">
                    <div className="flex gap-2">
                        <Info className="w-5 h-5 text-[#00BCD4] shrink-0" />
                        <p className="text-sm text-gray-300">
                            Giữ API key của bạn an toàn. Không chia sẻ chúng trong mã phía máy khách (trình duyệt, ứng dụng di động).
                        </p>
                    </div>
                </div>
                <CodeBlock title="Định dạng Header" code="Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx" />
            </div>

            <div>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#252D3D] rounded-lg">
                        <Box className="w-6 h-6 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Base URL</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Tất cả các API request nên có tiền tố là base url.
                </p>
                <CodeBlock title="Phiên bản hiện tại (v1)" code={`${API_BASE_URL}/v1`} />
            </div>
        </section>

        {/* Endpoints */}
        <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#00BCD4]/20 rounded-lg">
                    <FileText className="w-6 h-6 text-[#00BCD4]" />
                </div>
                <h2 className="text-2xl font-bold">Danh sách Endpoints</h2>
            </div>
            
            {/* Account */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <CreditCard className="w-4 h-4" /> Tài khoản
                </h3>
                
                <Endpoint method="GET" path="/balance" description="Lấy số dư tín dụng hiện tại">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Trả về thông tin chi tiết về tài khoản liên kết với API key, bao gồm số dư tín dụng còn lại.
                    </p>
                    <CodeBlock 
                        title="Phản hồi 200 OK" 
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
                
                <Endpoint method="GET" path="/models" description="Liệt kê các model khả dụng">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Lấy danh sách tất cả các model tạo ảnh và video khả dụng cùng với các khả năng của chúng (tỷ lệ khung hình, thời lượng, v.v.).
                    </p>
                    <CodeBlock 
                        title="Phản hồi 200 OK" 
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
                title="Tạo ảnh (Image Generation)"
                method="POST"
                path="/image/generate"
                description="Tạo một job tạo ảnh mới"
                models={IMAGE_MODELS}
                defaultModelId="nano-banana-pro"
                type="image"
            />

            {/* Video Generation */}
            <InteractiveModelEndpoint 
                title="Tạo video (Video Generation)"
                method="POST"
                path="/video/generate"
                description="Tạo một job tạo video"
                models={VIDEO_MODELS}
                defaultModelId="kling-2.6"
                type="video"
            />

            {/* Motion Control */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <Clapperboard className="w-4 h-4" /> Motion Control
                </h3>
                
                <Endpoint method="POST" path="/motion/upload-image" description="Upload ảnh nhân vật lên Kling">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upload ảnh nhân vật trực tiếp lên CDN của Kling. Chấp nhận upload file HOẶC dữ liệu mã hóa base64.
                    </p>
                    <ParameterTable 
                        params={[
                            { name: "file", type: "file", required: false, description: "File ảnh nhân vật (JPG/PNG) - dùng cái này HOẶC base64_data." },
                            { name: "base64_data", type: "string", required: false, description: "Dữ liệu ảnh mã hóa Base64 - dùng cái này HOẶC file." }
                        ]} 
                    />
                    <CodeBlock 
                        title="Ví dụ Request (Upload File)" 
                        code={`curl -X POST ${API_BASE_URL}/motion/upload-image \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "file=@character.jpg"`} 
                    />
                    <CodeBlock 
                        title="Ví dụ Request (Base64)" 
                        code={`curl -X POST ${API_BASE_URL}/motion/upload-image \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "base64_data=iVBORw0KGgoAAAANSUhEUgAA..."`} 
                    />
                    <CodeBlock 
                        title="Phản hồi 200 OK" 
                        language="json" 
                        code={`{
  "url": "https://s15-kling.klingai.com/kling/..."
}`} 
                    />
                </Endpoint>

                <Endpoint method="POST" path="/motion/estimate-cost" description="Upload video tham chiếu chuyển động">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Bước 1: Upload video nguồn định nghĩa chuyển động. Trả về video URL để sử dụng trong quá trình tạo.
                    </p>
                    <ParameterTable 
                        params={[
                            { name: "motion_video", type: "file", required: true, description: "File video tham chiếu (MP4/MOV)." }
                        ]} 
                    />
                    <CodeBlock 
                        title="Ví dụ Request" 
                        code={`curl -X POST ${API_BASE_URL}/motion/estimate-cost \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "motion_video=@dance.mp4"`} 
                    />
                    <CodeBlock 
                        title="Phản hồi 200 OK" 
                        language="json" 
                        code={`{
  "video_url": "https://...",
  "video_cover_url": "https://...",
  "costs": { "720p": 120, "1080p": 150 }
}`} 
                    />
                </Endpoint>

                <Endpoint method="POST" path="/motion/generate" description="Tạo video sử dụng nhân vật + chuyển động">
                     <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Bước 2: Kết hợp ảnh nhân vật với video chuyển động. Bạn có thể upload file ảnh trực tiếp HOẶC cung cấp URL đã upload trước đó.
                    </p>
                    <ParameterTable 
                        params={[
                             { name: "motion_video_url", type: "string", required: true, description: "URL trả về từ estimate-cost." },
                             { name: "video_cover_url", type: "string", required: true, description: "Cover URL trả về từ estimate-cost." },
                             { name: "character_image", type: "file", required: false, description: "File ảnh nhân vật (thay thế cho character_image_url)." },
                             { name: "character_image_url", type: "string", required: false, description: "URL ảnh nhân vật đã upload trước (thay thế cho character_image)." },
                             { name: "mode", type: "string", required: false, description: "'std' (Tiêu chuẩn) hoặc 'pro' (Chuyên nghiệp). Mặc định: 'std'." }
                        ]} 
                    />
                     <CodeBlock 
                        title="Ví dụ Request (với upload file)" 
                        code={`curl -X POST ${API_BASE_URL}/motion/generate \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "character_image=@hero.png" \\
  -F "motion_video_url=https://..." \\
  -F "video_cover_url=https://..." \\
  -F "mode=pro"`} 
                    />
                     <CodeBlock 
                        title="Ví dụ Request (với URL)" 
                        code={`curl -X POST ${API_BASE_URL}/motion/generate \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "character_image_url=https://..." \\
  -F "motion_video_url=https://..." \\
  -F "video_cover_url=https://..." \\
  -F "mode=pro"`} 
                    />
                    <CodeBlock 
                        title="Phản hồi 200 OK" 
                        language="json" 
                        code={`{
  "job_id": "job_motion_123",
  "status": "pending"
} `} 
                    />
                </Endpoint>
            </div>

            {/* File Uploads */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-sm">
                    <FileText className="w-4 h-4" /> Upload File
                </h3>
                
                <Endpoint method="POST" path="/files/upload/kling" description="Upload ảnh cho Kling I2V">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upload ảnh để sử dụng với các model Kling. Trả về ID và URL.
                    </p>
                    <ParameterTable 
                        params={[
                            { name: "file", type: "file", required: true, description: "File ảnh để upload (JPEG/PNG)." }
                        ]} 
                    />
                    <CodeBlock 
                        title="Ví dụ Request" 
                        code={`curl -X POST ${API_BASE_URL}/v1/files/upload/kling \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "file=@image.png"`} 
                    />
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

                <Endpoint method="POST" path="/files/upload/veo" description="Upload ảnh cho Veo I2V">
                     <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upload ảnh để sử dụng với các model Google Veo. Trả về media_id.
                    </p>
                    <ParameterTable 
                        params={[
                            { name: "file", type: "file", required: true, description: "File ảnh để upload (JPEG/PNG)." },
                            { name: "aspect_ratio", type: "string", required: false, description: "Tỷ lệ khung hình mong muốn (mặc định 9:16)." }
                        ]} 
                    />
                    <CodeBlock 
                        title="Ví dụ Request" 
                        code={`curl -X POST ${API_BASE_URL}/v1/files/upload/veo \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "file=@image.png"`} 
                    />
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
                    <Info className="w-4 h-4" /> Kiểm tra & Trạng thái
                </h3>
                
                <Endpoint method="GET" path="/jobs/{job_id}" description="Kiểm tra trạng thái job">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Lấy trạng thái và kết quả của bất kỳ background job nào (Ảnh, Video, hoặc Motion Control).
                        <br/>
                        Khi <code>status</code> là "completed", trường <code>result</code> chứa đường dẫn download trực tiếp.
                    </p>
                    <CodeBlock title="Phản hồi (Đang xử lý)" language="json" code={`{ "status": "processing", "result": null }`} />
                     <CodeBlock title="Phản hồi (Hoàn thành)" language="json" code={`{ 
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
                <h2 className="text-2xl font-bold">Mã lỗi (Error Codes)</h2>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-[#1a1f2e] shadow-sm">
                <table className="w-full text-sm text-left">
                     <thead className="bg-[#1a1f2e] text-gray-300 font-medium">
                        <tr>
                            <th className="px-6 py-4 border-b border-white/10 w-24">Mã</th>
                            <th className="px-6 py-4 border-b border-white/10 w-1/4">Lỗi</th>
                            <th className="px-6 py-4 border-b border-white/10">Mô tả</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-[#0d1117]/50">
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">400</td>
                            <td className="px-6 py-4 text-gray-300">Bad Request</td>
                            <td className="px-6 py-4 text-gray-400">Thiếu tham số, định dạng file không hợp lệ, hoặc yêu cầu bị lỗi.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">401</td>
                            <td className="px-6 py-4 text-gray-300">Unauthorized</td>
                            <td className="px-6 py-4 text-gray-400">API key không hợp lệ hoặc bị thiếu.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">402</td>
                            <td className="px-6 py-4 text-gray-300">Insufficient Funds</td>
                            <td className="px-6 py-4 text-gray-400">Số dư tài khoản quá thấp cho yêu cầu này. Nạp thêm trong Dashboard.</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">403</td>
                            <td className="px-6 py-4 text-gray-300">Forbidden</td>
                            <td className="px-6 py-4 text-gray-400">API key không có quyền truy cập tài nguyên này.</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">404</td>
                            <td className="px-6 py-4 text-gray-300">Not Found</td>
                            <td className="px-6 py-4 text-gray-400">Job ID hoặc tài nguyên được yêu cầu không tồn tại.</td>
                        </tr>
                          <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">429</td>
                            <td className="px-6 py-4 text-gray-300">Too Many Requests</td>
                            <td className="px-6 py-4 text-gray-400">Vượt quá giới hạn rate limit (1000 request mỗi phút).</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">500</td>
                            <td className="px-6 py-4 text-gray-300">Internal Server Error</td>
                            <td className="px-6 py-4 text-gray-400">Có lỗi xảy ra từ phía chúng tôi. Vui lòng báo cáo cho bộ phận hỗ trợ.</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-mono font-bold text-white">503</td>
                            <td className="px-6 py-4 text-gray-300">Service Unavailable</td>
                            <td className="px-6 py-4 text-gray-400">Nhà cung cấp model AI hiện đang bị quá tải hoặc đang bảo trì.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm border-t border-white/10 pt-12">
            <p className="mb-2">Cần hỗ trợ tích hợp? Liên hệ chúng tôi qua Zalo 0352143210.</p>
            <a href="mailto:leductummo@gmail.com" className="text-[#00BCD4] hover:underline font-medium">leductummo@gmail.com</a>
        </div>
      </div>
    </div>
  )
}
