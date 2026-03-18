import { useState } from 'react'
import './App.css'
import UploadPage from './components/UploadPage'
import PreviewPage from './components/PreviewPage'

type AppPage = 'upload' | 'preview'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('upload')
  const [generatedDoc, setGeneratedDoc] = useState<string>('')

  const handleDocGenerated = (doc: string) => {
    setGeneratedDoc(doc)
    setCurrentPage('preview')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            数据标注解析文档生成工具
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            上传标注规范和示例数据，自动生成数据解析说明文档
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {currentPage === 'upload' ? (
          <UploadPage onDocGenerated={handleDocGenerated} />
        ) : (
          <PreviewPage
            doc={generatedDoc}
            onBack={() => setCurrentPage('upload')}
          />
        )}
      </main>
    </div>
  )
}

export default App
