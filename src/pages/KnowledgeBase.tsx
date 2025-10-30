import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Agent, KnowledgeBase as KB, KnowledgeDocument } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Layout } from '@/components/Layout'
import { FileUpload } from '@/components/FileUpload'
import { UrlKnowledgeForm } from '@/components/UrlKnowledgeForm'
import { documentService } from '@/services/documentService'
import { 
  ArrowLeft, 
  FileText, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Loader2,
  File,
  Sheet,
  Download,
  Database
} from 'lucide-react'

const getFileIcon = (fileType?: string) => {
  if (!fileType) return File
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('wordprocessing')) return FileText
  if (fileType.includes('spreadsheet')) return Sheet
  return File
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'completed':
      return CheckCircle2
    case 'processing':
      return Loader2
    case 'failed':
      return AlertCircle
    default:
      return Circle
  }
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-500'
    case 'processing':
      return 'text-blue-500 animate-spin'
    case 'failed':
      return 'text-red-500'
    default:
      return 'text-gray-400'
  }
}

export function KnowledgeBase() {
  const { id } = useParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [knowledgeBases, setKnowledgeBases] = useState<KB[]>([])
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [selectedKB, setSelectedKB] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  })

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (selectedKB) {
      loadDocuments(selectedKB)
      loadStats(selectedKB)
    }
  }, [selectedKB])

  const loadData = async () => {
    try {
      console.log('🔄 Carregando dados do agente:', id)
      
      // Load agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single()

      if (agentError) throw agentError
      console.log('✅ Agente carregado:', agentData)
      setAgent(agentData)

      // Load knowledge bases
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('agent_id', id)

      if (kbError) throw kbError
      console.log('📚 Bases de conhecimento:', kbData)
      setKnowledgeBases(kbData || [])

      if (kbData && kbData.length > 0) {
        // Tentar encontrar a base com mais documentos
        let selectedBase = kbData[0]
        let maxDocs = 0
        
        // Verificar qual base tem documentos
        for (const kb of kbData) {
          const { count, error } = await supabase
            .from('knowledge_documents')
            .select('*', { count: 'exact', head: true })
            .eq('knowledge_base_id', kb.id)
          
          console.log(`📊 Base ${kb.id}: ${count || 0} documentos`)
          
          if (!error && count && count > maxDocs) {
            maxDocs = count
            selectedBase = kb
            console.log('✅ Base com mais documentos encontrada:', kb.id, `(${count} docs)`)
          }
        }
        
        if (maxDocs === 0) {
          console.log('⚠️ Nenhuma base tem documentos, usando primeira')
        }
        
        console.log('✅ Selecionando base:', selectedBase.id, `(${maxDocs} docs)`)
        setSelectedKB(selectedBase.id)
      } else {
        // Create default knowledge base if none exists
        console.log('⚠️ Nenhuma base encontrada, criando padrão...')
        await createDefaultKB()
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDefaultKB = async () => {
    try {
      // Verificar se já existe alguma base antes de criar
      const { data: existing, error: checkError } = await supabase
        .from('knowledge_bases')
        .select('id')
        .eq('agent_id', id)
        .limit(1)

      if (checkError) throw checkError

      // Se já existe, usar a existente ao invés de criar
      if (existing && existing.length > 0) {
        setKnowledgeBases(existing)
        setSelectedKB(existing[0].id)
        return
      }

      // Buscar agent para pegar organization_id
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('id', id)
        .single()

      if (agentError) throw agentError

      // Criar nova base apenas se não existir nenhuma
      const { data, error } = await supabase
        .from('knowledge_bases')
        .insert([
          {
            agent_id: id,
            organization_id: agentData.organization_id,
            name: 'Base Principal',
            description: 'Base de conhecimento principal do agente',
          },
        ])
        .select()
        .single()

      if (error) throw error
      setKnowledgeBases([data])
      setSelectedKB(data.id)
    } catch (error) {
      console.error('Erro ao criar base de conhecimento:', error)
    }
  }

  const loadDocuments = async (kbId: string) => {
    try {
      console.log('📄 Carregando documentos para KB:', kbId)
      const docs = await documentService.getDocuments(kbId)
      console.log('📄 Documentos carregados:', docs.length, docs)
      
      // Group by file_path to show unique files (not all chunks)
      const uniqueFiles = new Map<string, KnowledgeDocument>()
      docs.forEach(doc => {
        const key = doc.file_path || doc.id
        if (!uniqueFiles.has(key)) {
          uniqueFiles.set(key, doc)
        }
      })
      
      const uniqueDocsArray = Array.from(uniqueFiles.values())
      console.log('📄 Documentos únicos:', uniqueDocsArray.length, uniqueDocsArray)
      setDocuments(uniqueDocsArray)
    } catch (error) {
      console.error('❌ Erro ao carregar documentos:', error)
    }
  }

  const loadStats = async (kbId: string) => {
    const statsData = await documentService.getProcessingStats(kbId)
    setStats(statsData)
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento e todos os seus chunks?')) return

    try {
      await documentService.deleteDocument(docId)
      if (selectedKB) {
        loadDocuments(selectedKB)
        loadStats(selectedKB)
      }
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
      alert('Erro ao excluir documento')
    }
  }

  const retryProcessing = async (docId: string) => {
    if (!selectedKB) return

    try {
      await documentService.retryProcessing(docId, selectedKB)
      setTimeout(() => {
        if (selectedKB) {
          loadDocuments(selectedKB)
          loadStats(selectedKB)
        }
      }, 2000)
    } catch (error) {
      console.error('Erro ao reprocessar documento:', error)
      alert('Erro ao reprocessar documento')
    }
  }

  const handleUploadComplete = () => {
    if (selectedKB) {
      loadDocuments(selectedKB)
      loadStats(selectedKB)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Base de Conhecimento
            </h1>
            <p className="text-muted-foreground mt-2">
              {agent?.name}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Circle className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Pendente</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Processando</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processing}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Concluído</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Falhas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
          </motion.div>
        </div>

        {/* Knowledge Base Selector */}
        {knowledgeBases.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label htmlFor="kb-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Base de Conhecimento:
                </label>
                <select
                  id="kb-select"
                  value={selectedKB || ''}
                  onChange={(e) => setSelectedKB(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name} (ID: {kb.id.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload */}
        {selectedKB && (
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documentos</CardTitle>
              <CardDescription>
                Faça upload de PDFs, DOCX, XLSX ou arquivos TXT para vetorização automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                knowledgeBaseId={selectedKB} 
                onUploadComplete={handleUploadComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Web Scraper - URL Knowledge */}
        {selectedKB && id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de Conhecimento via URL (Web Scraper)
              </CardTitle>
              <CardDescription>
                Adicione URLs de páginas web para extração automática de conteúdo e vetorização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UrlKnowledgeForm 
                knowledgeBaseId={selectedKB}
                agentId={id}
                onSuccess={handleUploadComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  {documents.length} arquivo{documents.length !== 1 ? 's' : ''} na base
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedKB && loadDocuments(selectedKB)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  Nenhum documento adicionado ainda
                </p>
                <p className="text-sm text-gray-400">
                  Faça upload de arquivos para começar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const FileIcon = getFileIcon(doc.file_type)
                  const StatusIcon = getStatusIcon(doc.processing_status)
                  const statusColor = getStatusColor(doc.processing_status)

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-5 h-5 text-orange-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {doc.file_name || 'Documento sem nome'}
                            </h4>
                            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusColor}`} />
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                            <span>
                              {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(doc.created_at).toLocaleString('pt-BR')}
                            </span>
                            {doc.chunks_count && doc.chunks_count > 1 && (
                              <>
                                <span>•</span>
                                <span>{doc.chunks_count} chunks</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              doc.processing_status === 'completed'
                                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                                : doc.processing_status === 'processing'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                : doc.processing_status === 'failed'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {doc.processing_status === 'completed' && 'Vetorizado'}
                              {doc.processing_status === 'processing' && 'Processando...'}
                              {doc.processing_status === 'failed' && 'Falha'}
                              {doc.processing_status === 'pending' && 'Pendente'}
                            </span>
                          </div>

                          {doc.error_message && (
                            <p className="text-xs text-red-500 mt-2">
                              Erro: {doc.error_message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {doc.processing_status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryProcessing(doc.id)}
                            title="Reprocessar"
                          >
                            <RefreshCw className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
