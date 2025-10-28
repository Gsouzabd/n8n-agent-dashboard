import { supabase } from '@/lib/supabase'
import { KnowledgeDocument } from '@/types'

export const documentService = {
  /**
   * Upload a file to Supabase Storage and create document record
   */
  async uploadDocument(
    file: File,
    knowledgeBaseId: string
  ): Promise<{ documentId: string; filePath: string }> {
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${knowledgeBaseId}/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('Failed to upload file: ' + uploadError.message)
      }

      // Create document record
      const { data: document, error: insertError } = await supabase
        .from('knowledge_documents')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          content: '', // Will be filled by Edge Function
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath,
          processing_status: 'pending',
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (insertError || !document) {
        // Cleanup uploaded file
        await supabase.storage
          .from('knowledge-documents')
          .remove([filePath])

        throw new Error('Failed to create document record: ' + insertError?.message)
      }

      return {
        documentId: document.id,
        filePath,
      }
    } catch (error) {
      console.error('Document upload error:', error)
      throw error
    }
  },

  /**
   * Trigger document processing via Edge Function
   */
  async processDocument(documentId: string, knowledgeBaseId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          documentId,
          knowledgeBaseId,
        },
      })

      if (error) {
        console.error('Processing error:', error)
        throw new Error('Failed to process document: ' + error.message)
      }

      console.log('Document processed:', data)
    } catch (error) {
      console.error('Process document error:', error)
      throw error
    }
  },

  /**
   * Get documents for a knowledge base
   */
  async getDocuments(knowledgeBaseId: string): Promise<KnowledgeDocument[]> {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('knowledge_base_id', knowledgeBaseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get documents error:', error)
      throw new Error('Failed to fetch documents')
    }

    return data || []
  },

  /**
   * Delete a document and its file from storage
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document info
      const { data: document, error: fetchError } = await supabase
        .from('knowledge_documents')
        .select('file_path, metadata')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        throw new Error('Failed to fetch document: ' + fetchError.message)
      }

      // Delete all chunks (documents with same file_path)
      if (document.file_path) {
        await supabase
          .from('knowledge_documents')
          .delete()
          .eq('file_path', document.file_path)
      } else {
        // Just delete this document
        await supabase
          .from('knowledge_documents')
          .delete()
          .eq('id', documentId)
      }

      // Delete file from storage if exists
      if (document.file_path) {
        const { error: deleteError } = await supabase.storage
          .from('knowledge-documents')
          .remove([document.file_path])

        if (deleteError) {
          console.warn('Failed to delete file from storage:', deleteError)
        }
      }
    } catch (error) {
      console.error('Delete document error:', error)
      throw error
    }
  },

  /**
   * Get file download URL
   */
  async getFileUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('knowledge-documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (!data) {
      throw new Error('Failed to generate file URL')
    }

    return data.signedUrl
  },

  /**
   * Retry failed document processing
   */
  async retryProcessing(documentId: string, knowledgeBaseId: string): Promise<void> {
    // Reset status to pending
    await supabase
      .from('knowledge_documents')
      .update({
        processing_status: 'pending',
        error_message: null,
      })
      .eq('id', documentId)

    // Trigger processing again
    await this.processDocument(documentId, knowledgeBaseId)
  },

  /**
   * Get processing statistics
   */
  async getProcessingStats(knowledgeBaseId: string) {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('processing_status, file_path')
      .eq('knowledge_base_id', knowledgeBaseId)

    if (error) {
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }
    }

    // Group by file_path to count unique files (not chunks)
    const uniqueFiles = new Map()
    data.forEach(doc => {
      const key = doc.file_path || doc.id
      if (!uniqueFiles.has(key)) {
        uniqueFiles.set(key, doc.processing_status)
      }
    })

    const stats = {
      total: uniqueFiles.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }

    uniqueFiles.forEach((status) => {
      if (status in stats) {
        stats[status as keyof typeof stats]++
      }
    })

    return stats
  },
}

