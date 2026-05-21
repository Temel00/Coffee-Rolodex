import { Scale, Gauge, Droplets, StickyNote } from 'lucide-react'
import type { GrindProfile } from '../types'

interface Props {
  profile: GrindProfile
  index: number
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-text-faint text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-text font-semibold text-lg leading-tight">{value}</span>
    </div>
  )
}

export default function GrindProfileCard({ profile, index }: Props) {
  const hasAnyValue =
    profile.dosage_g != null ||
    profile.grind_size != null ||
    profile.water_amount_ml != null

  return (
    <div className="card-elevated flex flex-col gap-4 min-w-[220px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-text-faint text-sm font-medium">Profile {index + 1}</div>
          {profile.basket_type && (
            <div className="text-primary font-bold text-lg leading-tight mt-0.5">
              {profile.basket_type}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {hasAnyValue && (
        <div className="grid grid-cols-3 gap-4">
          <Stat
            icon={<Scale size={13} />}
            label="Dose"
            value={profile.dosage_g != null ? `${profile.dosage_g}g` : null}
          />
          <Stat
            icon={<Gauge size={13} />}
            label="Grind"
            value={profile.grind_size}
          />
          <Stat
            icon={<Droplets size={13} />}
            label="Yield"
            value={profile.water_amount_ml != null ? `${profile.water_amount_ml}ml` : null}
          />
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <div className="flex items-start gap-2 text-text-muted text-sm border-t border-border-subtle pt-3 mt-1">
          <StickyNote size={14} className="shrink-0 mt-0.5 text-text-faint" />
          <span className="leading-snug line-clamp-2">{profile.notes}</span>
        </div>
      )}
    </div>
  )
}
