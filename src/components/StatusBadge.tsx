const config = {
  draft:            { label: 'Brouillon',   bg: 'bg-gray-100',   text: 'text-gray-600' },
  sent:             { label: 'Envoyé',      bg: 'bg-blue-50',    text: 'text-blue-600' },
  accepted:         { label: 'Accepté',     bg: 'bg-green-50',   text: 'text-green-600' },
  refused:          { label: 'Refusé',      bg: 'bg-red-50',     text: 'text-red-600' },
  pending_approval: { label: '⏳ À valider', bg: 'bg-purple-50', text: 'text-purple-600' },
  cancelled:        { label: '🚫 Annulé',   bg: 'bg-gray-100',   text: 'text-gray-400' },
}

export function StatusBadge({ status }: { status: 'draft' | 'sent' | 'accepted' | 'refused' | 'pending_approval' | 'cancelled' }) {
  const c = config[status] || config.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
