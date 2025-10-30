import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ChevronDown, Building2, Plus, Check } from 'lucide-react'

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  if (!currentOrganization) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[150px] truncate">
          {currentOrganization.name}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1 mb-1">Organizações</div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrganization(org.id)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-white flex-1 text-left truncate">
                  {org.name}
                </span>
                {org.id === currentOrganization.id && (
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 p-2">
            <Link
              to="/organizations/new"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-orange-500"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Nova Organização</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

