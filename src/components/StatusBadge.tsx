const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:            { label: 'Brouillon',  bg: '#F1F5F9', color: '#64748B', dot: '#CBD5E1' },
  sent:             { label: 'Envoyé',     bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
  accepted:         { label: 'Accepté',   bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  refused:          { label: 'Refusé',    bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
  pending_approval: { label: 'À valider', bg: '#F5F3FF', color: '#7C3AED', dot: '#8B5CF6' },
  cancelled:        { label: 'Annulé',    bg: '#F9FAFB', color: '#9CA3AF', dot: '#D1D5DB' },
}

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}
