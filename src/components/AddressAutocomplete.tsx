import { useState, useRef, useEffect } from 'react'

interface Suggestion {
  label: string
  street: string
  city: string
  zip: string
}

interface Props {
  value: string
  onChange: (street: string, city: string, zip: string) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  const search = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
        )
        const data = await res.json()
        const hits: Suggestion[] = (data.features || []).map((f: any) => ({
          label: f.properties.label,
          street: f.properties.name,
          city: f.properties.city,
          zip: f.properties.postcode,
        }))
        setSuggestions(hits)
        setOpen(hits.length > 0)
      } catch {}
      setLoading(false)
    }, 350)
  }

  const select = (s: Suggestion) => {
    setQuery(s.street)
    setSuggestions([])
    setOpen(false)
    onChange(s.street, s.city, s.zip)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={e => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || '14 rue des Lilas...'}
          className={className || 'input-field'}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 z-40 overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => select(s)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <p className="text-gray-900 font-medium text-sm">{s.street}</p>
              <p className="text-gray-400 text-xs mt-0.5">{s.zip} {s.city}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
