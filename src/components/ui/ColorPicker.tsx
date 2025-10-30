import { useState, useRef, useEffect } from 'react'
import { Input } from './Input'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={pickerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 transition-all hover:scale-105"
          style={{ backgroundColor: value }}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-48 h-32 cursor-pointer border-none"
          />
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[
              '#F07D00', '#FF6B00', '#FF8C00', '#FFA500',
              '#000000', '#1F2937', '#374151', '#6B7280',
              '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
              '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'
            ].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-700 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

