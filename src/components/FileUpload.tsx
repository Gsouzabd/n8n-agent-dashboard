import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, FileText, Sheet, X, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { DocumentContextModal } from './DocumentContextModal'
import { documentService } from '@/services/documentService'

interface FileUploadProps {
  knowledgeBaseId: string
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  documentId?: string
}

interface DocumentContextData {
  document_description: string
  usage_context: string
  usage_instructions: string
  dialogue_examples: Array<{ user: string; ai: string }>
  tags: string[]
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('wordprocessing')) return FileText
  if (fileType.includes('spreadsheet')) return Sheet
  return File
}

const getFileColor = (fileType: string) => {
  if (fileType.includes('pdf')) return 'text-red-500'
  if (fileType.includes('wordprocessing')) return 'text-blue-500'
  if (fileType.includes('spreadsheet')) return 'text-green-500'
  return 'text-gray-500'
}

export function FileUpload({ knowledgeBaseId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map())
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showContextModal, setShowContextModal] = useState(false)
  const [pendingContext, setPendingContext] = useState<DocumentContextData | null>(null)

  const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB em bytes

  const selectFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      
      // Filter supported files and ignore macOS metadata files
      const supportedFiles = fileArray.filter(file => {
        // Ignore macOS metadata files
        if (file.name.startsWith('._') || file.name === '.DS_Store') {
          return false
        }
        
        const type = file.type
        return (
          type === 'application/pdf' ||
          type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          type === 'text/plain'
        )
      })

      if (supportedFiles.length === 0) {
        alert('Nenhum arquivo suportado selecionado. Use PDF, DOCX, XLSX ou TXT.')
        return
      }

      // Check file sizes
      const tooLargeFiles = supportedFiles.filter(file => file.size > MAX_FILE_SIZE)
      if (tooLargeFiles.length > 0) {
        const fileList = tooLargeFiles.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join('\n')
        alert(
          `⚠️ Arquivos muito grandes (limite: ${MAX_FILE_SIZE / 1024 / 1024} MB):\n\n${fileList}\n\n` +
          `💡 Soluções:\n` +
          `1. Comprima o PDF (ILovePDF, Smallpdf)\n` +
          `2. Divida em partes menores\n` +
          `3. Aumente o limite no banco (veja docs/ARQUIVOS_GRANDES.md)`
        )
        return
      }

      // Show context modal for first file
      if (supportedFiles.length > 0) {
        setPendingFile(supportedFiles[0])
        setShowContextModal(true)
      }
    },
    [MAX_FILE_SIZE]
  )

  const handleContextSubmit = useCallback(
    async (context: DocumentContextData) => {
      if (!pendingFile) return

      setShowContextModal(false)
      setPendingContext(context)

      const key = `${pendingFile.name}-${pendingFile.size}-${Date.now()}`
      const newUploading = new Map(uploadingFiles)
      newUploading.set(key, {
        file: pendingFile,
        status: 'uploading',
        progress: 0,
      })
      setUploadingFiles(newUploading)

      try {
        // Upload file with context
        setUploadingFiles(prev => {
          const next = new Map(prev)
          const item = next.get(key)
          if (item) {
            item.progress = 25
          }
          return next
        })

        const { documentId } = await documentService.uploadDocument(pendingFile, knowledgeBaseId, context)

        // Update to processing
        setUploadingFiles(prev => {
          const next = new Map(prev)
          const item = next.get(key)
          if (item) {
            item.status = 'processing'
            item.progress = 50
            item.documentId = documentId
          }
          return next
        })

        // Trigger processing
        await documentService.processDocument(documentId, knowledgeBaseId)

        // Update to completed
        setUploadingFiles(prev => {
          const next = new Map(prev)
          const item = next.get(key)
          if (item) {
            item.status = 'completed'
            item.progress = 100
          }
          return next
        })

        // Auto-remove after 3 seconds
        setTimeout(() => {
          setUploadingFiles(prev => {
            const next = new Map(prev)
            next.delete(key)
            return next
          })
        }, 3000)

        if (onUploadComplete) {
          onUploadComplete()
        }
      } catch (error) {
        console.error('Upload error:', error)
        setUploadingFiles(prev => {
          const next = new Map(prev)
          const item = next.get(key)
          if (item) {
            item.status = 'failed'
            item.error = error instanceof Error ? error.message : 'Erro ao processar arquivo'
          }
          return next
        })
      } finally {
        setPendingFile(null)
        setPendingContext(null)
      }
    },
    [pendingFile, knowledgeBaseId, uploadingFiles, onUploadComplete]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        selectFiles(files)
      }
    },
    [selectFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        selectFiles(files)
      }
      // Reset input
      e.target.value = ''
    },
    [selectFiles]
  )

  const removeFile = (key: string) => {
    setUploadingFiles(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  return (
    <>
      {/* Context Modal */}
      {showContextModal && pendingFile && (
        <DocumentContextModal
          fileName={pendingFile.name}
          onSubmit={handleContextSubmit}
          onCancel={() => {
            setShowContextModal(false)
            setPendingFile(null)
          }}
        />
      )}

      <div className="space-y-4">
      {/* Aviso sobre limite de arquivo */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Limite de arquivo aumentado
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Agora você pode fazer upload de arquivos de até <strong>30 MB</strong>. 
              Arquivos grandes levam mais tempo para processar (5-15 minutos).
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
              💡 Para arquivos maiores que 30 MB, considere comprimir ou dividir o PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
          isDragging
            ? 'border-orange-500 bg-orange-500/10 scale-105'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-orange-500/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.docx,.xlsx,.txt"
        />

        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-4 border border-orange-500/30"
          >
            <Upload className={`w-8 h-8 ${isDragging ? 'text-orange-500' : 'text-gray-400'}`} />
          </motion.div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            PDF, DOCX, XLSX ou TXT
          </p>
          <p className="text-xs text-orange-500 dark:text-orange-400 font-semibold mb-1">
            ⚡ Limite: {MAX_FILE_SIZE / 1024 / 1024} MB por arquivo
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Arquivos grandes podem levar vários minutos para processar
          </p>

          <Button
            type="button"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Selecionar Arquivos
          </Button>
        </label>
      </div>

      {/* Uploading Files List */}
      <AnimatePresence mode="popLayout">
        {Array.from(uploadingFiles.entries()).map(([key, fileData]) => {
          const Icon = getFileIcon(fileData.file.type)
          const iconColor = getFileColor(fileData.file.type)

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {fileData.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(fileData.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileData.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                      )}
                      {fileData.status === 'processing' && (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      )}
                      {fileData.status === 'completed' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {fileData.status === 'failed' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}

                      <button
                        onClick={() => removeFile(key)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {fileData.status !== 'failed' && fileData.status !== 'completed' && (
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fileData.progress}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full ${
                          fileData.status === 'uploading'
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  )}

                  {/* Status Text */}
                  <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                    {fileData.status === 'uploading' && 'Enviando...'}
                    {fileData.status === 'processing' && 'Processando e vetorizando...'}
                    {fileData.status === 'completed' && 'Concluído!'}
                    {fileData.status === 'failed' && (
                      <span className="text-red-500">{fileData.error}</span>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      </div>
    </>
  )
}

