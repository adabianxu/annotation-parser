import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import mermaid from 'mermaid'

interface PreviewPageProps {
  doc: string
  onBack: () => void
}

export default function PreviewPage({ doc, onBack }: PreviewPageProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview')
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    })
  }, [])

  useEffect(() => {
    if (activeTab === 'preview' && mermaidRef.current) {
      mermaid.run({
        nodes: mermaidRef.current.querySelectorAll('.mermaid'),
      })
    }
  }, [activeTab, doc])

  const handleDownload = () => {
    const blob = new Blob([doc], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '数据解析说明文档.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上传
        </button>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              预览
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'source'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              源码
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            下载 Markdown
          </button>
        </div>
      </div>

      {/* 文档内容 */}
      <div className="bg-white rounded-lg shadow min-h-[600px]">
        {activeTab === 'preview' ? (
          <div
            ref={mermaidRef}
            className="prose prose-slate max-w-none p-8"
          >
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (match && match[1] === 'mermaid') {
                    return (
                      <div className="mermaid bg-gray-50 p-4 rounded-lg overflow-auto">
                        {String(children).replace(/\n$/, '')}
                      </div>
                    )
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {doc}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="p-8">
            <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto text-sm">
              <code>{doc}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
