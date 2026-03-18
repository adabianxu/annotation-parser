import { useState, useRef } from 'react'
import { Upload, FileText, Settings, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { parseConfig, parseSpecDocument, parseExampleFiles, matchFields } from '../parsers'
import { generateDocument } from '../generators'

interface UploadPageProps {
  onDocGenerated: (doc: string) => void
}

interface FileStatus {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  message?: string
}

export default function UploadPage({ onDocGenerated }: UploadPageProps) {
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [configFile, setConfigFile] = useState<File | null>(null)
  const [exampleFiles, setExampleFiles] = useState<FileStatus[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const specInputRef = useRef<HTMLInputElement>(null)
  const configInputRef = useRef<HTMLInputElement>(null)
  const exampleInputRef = useRef<HTMLInputElement>(null)

  const handleSpecUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.md')) {
      setSpecFile(file)
      setError(null)
    }
  }

  const handleConfigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.json')) {
      setConfigFile(file)
      setError(null)
    }
  }

  const handleExampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const jsonFiles = Array.from(files).filter(f => f.name.endsWith('.json'))
      setExampleFiles(jsonFiles.map(f => ({ file: f, status: 'pending' })))
      setError(null)
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  const handleGenerate = async () => {
    if (!specFile || !configFile || exampleFiles.length === 0) return

    setIsGenerating(true)
    setError(null)

    try {
      // 1. 读取并解析标注规范文档
      const specContent = await readFileContent(specFile)
      const parsedSpec = parseSpecDocument(specContent)

      // 2. 读取并解析配置文件
      const configContent = await readFileContent(configFile)
      const parsedConfig = parseConfig(configContent)

      // 3. 读取并解析示例数据
      const exampleContents: string[] = []
      for (const fileStatus of exampleFiles) {
        const content = await readFileContent(fileStatus.file)
        exampleContents.push(content)
      }
      const parsedExamples = parseExampleFiles(exampleContents)

      // 4. 字段匹配
      const matches = matchFields(parsedConfig, parsedSpec)

      // 5. 生成文档
      const document = generateDocument(parsedConfig, parsedSpec, parsedExamples, matches)

      onDocGenerated(document)
    } catch (err) {
      console.error('生成文档失败:', err)
      setError(err instanceof Error ? err.message : '生成文档时发生错误')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = specFile && configFile && exampleFiles.length > 0

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">生成失败</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 标注规范文档上传 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">1. 上传标注规范文档</h2>
            <p className="text-sm text-gray-600">Markdown 格式，包含字段定义和脏数据说明</p>
          </div>
        </div>

        <input
          ref={specInputRef}
          type="file"
          accept=".md"
          onChange={handleSpecUpload}
          className="hidden"
        />

        <div
          onClick={() => specInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            specFile
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {specFile ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{specFile.name}</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>点击上传 Markdown 文件</p>
            </div>
          )}
        </div>
      </div>

      {/* 配置文件上传 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">2. 上传配置文件</h2>
            <p className="text-sm text-gray-600">JSON 格式，包含标注规则和字段定义</p>
          </div>
        </div>

        <input
          ref={configInputRef}
          type="file"
          accept=".json"
          onChange={handleConfigUpload}
          className="hidden"
        />

        <div
          onClick={() => configInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            configFile
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
          }`}
        >
          {configFile ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{configFile.name}</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>点击上传 JSON 配置文件</p>
            </div>
          )}
        </div>
      </div>

      {/* 示例数据上传 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <FolderOpen className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">3. 选择示例数据</h2>
            <p className="text-sm text-gray-600">回流标注数据 JSON 文件，支持多文件</p>
          </div>
        </div>

        <input
          ref={exampleInputRef}
          type="file"
          accept=".json"
          multiple
          onChange={handleExampleUpload}
          className="hidden"
        />

        <div
          onClick={() => exampleInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            exampleFiles.length > 0
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
          }`}
        >
          {exampleFiles.length > 0 ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>已选择 {exampleFiles.length} 个文件</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>点击选择 JSON 文件（可多选）</p>
            </div>
          )}
        </div>

        {exampleFiles.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-600 mb-2">已选择的文件：</p>
            <ul className="text-sm text-gray-700 space-y-1">
              {exampleFiles.slice(0, 5).map((f, i) => (
                <li key={i} className="truncate">{f.file.name}</li>
              ))}
              {exampleFiles.length > 5 && (
                <li className="text-gray-500">...还有 {exampleFiles.length - 5} 个文件</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 生成按钮 */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
            canGenerate && !isGenerating
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⟳</span>
              正在生成文档...
            </span>
          ) : (
            '开始生成文档'
          )}
        </button>
      </div>

      {!canGenerate && (
        <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>请先完成上述三个步骤的文件上传</span>
        </div>
      )}
    </div>
  )
}
