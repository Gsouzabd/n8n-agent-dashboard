import { useState } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Textarea } from './ui/Textarea'
import { X, Plus, Trash2, FileText } from 'lucide-react'

interface DialogueExample {
  user: string
  ai: string
}

interface DocumentContextData {
  document_description: string
  usage_context: string
  usage_instructions: string
  dialogue_examples: DialogueExample[]
  tags: string[]
  via_ocr?: boolean
}

interface DocumentContextModalProps {
  fileName: string
  onSubmit: (context: DocumentContextData) => void
  onCancel: () => void
}

export function DocumentContextModal({ fileName, onSubmit, onCancel }: DocumentContextModalProps) {
  const [description, setDescription] = useState('')
  const [usageContext, setUsageContext] = useState('')
  const [usageInstructions, setUsageInstructions] = useState('')
  const [dialogueExamples, setDialogueExamples] = useState<DialogueExample[]>([{ user: '', ai: '' }])
  const [tagsInput, setTagsInput] = useState('')
  const [viaOcr, setViaOcr] = useState(false)

  const handleAddExample = () => {
    setDialogueExamples([...dialogueExamples, { user: '', ai: '' }])
  }

  const handleRemoveExample = (index: number) => {
    setDialogueExamples(dialogueExamples.filter((_, i) => i !== index))
  }

  const handleExampleChange = (index: number, field: 'user' | 'ai', value: string) => {
    const newExamples = [...dialogueExamples]
    newExamples[index][field] = value
    setDialogueExamples(newExamples)
  }

  const handleSubmit = () => {
    // Validação básica
    if (description.length < 20) {
      alert('A descrição deve ter pelo menos 20 caracteres')
      return
    }
    if (usageContext.length < 20) {
      alert('O contexto de uso deve ter pelo menos 20 caracteres')
      return
    }
    if (usageInstructions.length < 20) {
      alert('As instruções de uso devem ter pelo menos 20 caracteres')
      return
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const validExamples = dialogueExamples.filter((ex) => ex.user.trim() && ex.ai.trim())

    onSubmit({
      document_description: description,
      usage_context: usageContext,
      usage_instructions: usageInstructions,
      dialogue_examples: validExamples,
      tags,
      via_ocr: viaOcr,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Contexto do Documento
              </h2>
              <p className="text-sm text-gray-500 mt-1">{fileName}</p>
            </div>

          {/* OCR Option */}
          <div className="p-3 border border-amber-200 dark:border-amber-800 rounded-md bg-amber-50 dark:bg-amber-900/20">
            <label className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100 cursor-pointer">
              <input
                type="checkbox"
                checked={viaOcr}
                onChange={(e) => setViaOcr(e.target.checked)}
                className="mt-1"
              />
              <span>
                Processar via OCR (n8n)
                <span className="block text-xs text-amber-700 dark:text-amber-200/80">
                  Envia o PDF ao webhook para OCR (recomendado para PDFs escaneados).
                </span>
              </span>
            </label>
          </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <Label htmlFor="description">🎯 O que há neste documento?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Contrato de prestação de serviços com cláusulas de pagamento e SLA"
              rows={3}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length < 20
                ? `Mínimo 20 caracteres (faltam ${20 - description.length})`
                : `✓ ${description.length} caracteres`}
            </p>
          </div>

          {/* Usage Context */}
          <div>
            <Label htmlFor="usage-context">📋 Quando usar este documento?</Label>
            <Textarea
              id="usage-context"
              value={usageContext}
              onChange={(e) => setUsageContext(e.target.value)}
              placeholder="Ex: Quando cliente perguntar sobre valores, prazos, garantias ou SLA"
              rows={3}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {usageContext.length < 20
                ? `Mínimo 20 caracteres (faltam ${20 - usageContext.length})`
                : `✓ ${usageContext.length} caracteres`}
            </p>
          </div>

          {/* Usage Instructions */}
          <div>
            <Label htmlFor="usage-instructions">🔧 Como usar este documento?</Label>
            <Textarea
              id="usage-instructions"
              value={usageInstructions}
              onChange={(e) => setUsageInstructions(e.target.value)}
              placeholder="Ex: Extrair informação específica e citar cláusula exata do contrato"
              rows={3}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {usageInstructions.length < 20
                ? `Mínimo 20 caracteres (faltam ${20 - usageInstructions.length})`
                : `✓ ${usageInstructions.length} caracteres`}
            </p>
          </div>

          {/* Dialogue Examples */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>💬 Exemplos de diálogo</Label>
              <Button variant="outline" size="sm" onClick={handleAddExample}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Exemplo
              </Button>
            </div>
            <div className="space-y-3">
              {dialogueExamples.map((example, index) => (
                <div key={index} className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Exemplo {index + 1}
                    </span>
                    {dialogueExamples.length > 1 && (
                      <button
                        onClick={() => handleRemoveExample(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    value={example.user}
                    onChange={(e) => handleExampleChange(index, 'user', e.target.value)}
                    placeholder='User: "Qual o prazo de entrega?"'
                    className="text-sm"
                  />
                  <Input
                    value={example.ai}
                    onChange={(e) => handleExampleChange(index, 'ai', e.target.value)}
                    placeholder='AI: "Conforme cláusula 3.2..."'
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">🏷️ Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="contrato, pagamento, SLA, garantia"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {tagsInput
                ? `Tags: ${tagsInput.split(',').map((t) => t.trim()).filter((t) => t).join(', ')}`
                : 'Adicione tags para facilitar a busca'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Processar Documento ✅
          </Button>
        </div>
      </div>
    </div>
  )
}

