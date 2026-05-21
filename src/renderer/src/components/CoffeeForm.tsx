import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import type { Coffee, GrindProfile, View } from '../types'
import ConfirmDialog from './ConfirmDialog'

const MAX_PROFILES = 5

interface Props {
  coffeeId?: string
  navigate: (v: View) => void
}

type CoffeeFields = {
  name: string
  roaster: string
  origin: string
  roast_date: string
  purchase_date: string
  net_weight_g: string
  notes: string
  is_active: boolean
}

type ProfileFields = {
  _localId: string      // UI-only key for list stability
  id?: string           // real DB id (undefined = new, not yet saved)
  basket_type: string
  dosage_g: string
  grind_size: string
  water_amount_ml: string
  notes: string
}

function emptyProfile(localId: string): ProfileFields {
  return { _localId: localId, basket_type: '', dosage_g: '', grind_size: '', water_amount_ml: '', notes: '' }
}

function emptyFields(): CoffeeFields {
  return {
    name: '', roaster: '', origin: '',
    roast_date: '', purchase_date: '',
    net_weight_g: '', notes: '', is_active: true,
  }
}

function coffeeToFields(c: Coffee): CoffeeFields {
  return {
    name: c.name,
    roaster: c.roaster,
    origin: c.origin,
    roast_date: c.roast_date ?? '',
    purchase_date: c.purchase_date ?? '',
    net_weight_g: c.net_weight_g != null ? String(c.net_weight_g) : '',
    notes: c.notes ?? '',
    is_active: c.is_active === 1,
  }
}

function profileToFields(p: GrindProfile): ProfileFields {
  return {
    _localId: p.id,
    id: p.id,
    basket_type: p.basket_type,
    dosage_g: p.dosage_g != null ? String(p.dosage_g) : '',
    grind_size: p.grind_size ?? '',
    water_amount_ml: p.water_amount_ml != null ? String(p.water_amount_ml) : '',
    notes: p.notes ?? '',
  }
}

let _localCounter = 0
function nextLocalId() { return `local-${++_localCounter}` }

// ── Single grind profile form block ──────────────────────────────────────────

interface ProfileFormProps {
  profile: ProfileFields
  index: number
  onChange: (updated: ProfileFields) => void
  onDelete: () => void
}

function ProfileForm({ profile, index, onChange, onDelete }: ProfileFormProps) {
  const set = (key: keyof ProfileFields, value: string) =>
    onChange({ ...profile, [key]: value })

  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-primary font-bold text-lg">Profile {index + 1}</h3>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onDelete}
          title="Remove profile"
        >
          <Trash2 size={18} className="text-danger" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="field-label">Basket / Filter Type</label>
          <input
            className="field-input"
            placeholder="e.g. 18g VST, 22g Pullman"
            value={profile.basket_type}
            onChange={(e) => set('basket_type', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Dose (g)</label>
          <input
            className="field-input"
            type="number"
            step="0.1"
            min="0"
            placeholder="18.0"
            value={profile.dosage_g}
            onChange={(e) => set('dosage_g', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Grind Size</label>
          <input
            className="field-input"
            placeholder="e.g. 3.5, click 12"
            value={profile.grind_size}
            onChange={(e) => set('grind_size', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Yield / Water (ml)</label>
          <input
            className="field-input"
            type="number"
            step="0.1"
            min="0"
            placeholder="36.0"
            value={profile.water_amount_ml}
            onChange={(e) => set('water_amount_ml', e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className="field-label">Notes</label>
          <textarea
            className="field-input resize-none"
            rows={2}
            placeholder="Tasting notes, observations…"
            value={profile.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function CoffeeForm({ coffeeId, navigate }: Props) {
  const isEditing = coffeeId !== undefined

  const [fields, setFields] = useState<CoffeeFields>(emptyFields())
  const [profiles, setProfiles] = useState<ProfileFields[]>([])
  const [deletedProfileIds, setDeletedProfileIds] = useState<string[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!coffeeId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [c, p] = await Promise.all([
        window.api.coffee.getById(coffeeId!),
        window.api.grind.getForCoffee(coffeeId!),
      ])
      if (cancelled) return
      if (c) setFields(coffeeToFields(c))
      setProfiles(p.map(profileToFields))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [coffeeId])

  const setField = useCallback(
    <K extends keyof CoffeeFields>(key: K, val: CoffeeFields[K]) =>
      setFields((f) => ({ ...f, [key]: val })),
    []
  )

  const addProfile = () => {
    if (profiles.length >= MAX_PROFILES) return
    setProfiles((p) => [...p, emptyProfile(nextLocalId())])
  }

  const updateProfile = (localId: string, updated: ProfileFields) =>
    setProfiles((p) => p.map((x) => (x._localId === localId ? updated : x)))

  const removeProfile = (localId: string) => {
    const target = profiles.find((p) => p._localId === localId)
    if (target?.id) setDeletedProfileIds((d) => [...d, target.id!])
    setProfiles((p) => p.filter((x) => x._localId !== localId))
  }

  const parseFloat2 = (s: string): number | null => {
    const n = parseFloat(s)
    return isNaN(n) ? null : n
  }

  const handleSave = async () => {
    if (!fields.name.trim()) {
      setError('Coffee name is required.')
      return
    }
    setError(null)
    setSaving(true)

    try {
      const coffeePayload = {
        name: fields.name.trim(),
        roaster: fields.roaster.trim(),
        origin: fields.origin.trim(),
        roast_date: fields.roast_date || null,
        purchase_date: fields.purchase_date || null,
        net_weight_g: parseFloat2(fields.net_weight_g),
        notes: fields.notes.trim() || null,
        is_active: fields.is_active ? 1 : 0,
      }

      let savedCoffeeId: string

      if (isEditing) {
        await window.api.coffee.update(coffeeId, coffeePayload)
        savedCoffeeId = coffeeId
      } else {
        const created = await window.api.coffee.create(coffeePayload)
        savedCoffeeId = created.id
      }

      // Delete removed profiles
      await Promise.all(deletedProfileIds.map((id) => window.api.grind.delete(id)))

      // Upsert profiles
      await Promise.all(
        profiles.map((p) => {
          const payload = {
            coffee_id: savedCoffeeId,
            basket_type: p.basket_type.trim(),
            dosage_g: parseFloat2(p.dosage_g),
            grind_size: p.grind_size.trim() || null,
            water_amount_ml: parseFloat2(p.water_amount_ml),
            notes: p.notes.trim() || null,
          }
          if (p.id) {
            return window.api.grind.update(p.id, payload)
          } else {
            return window.api.grind.create(payload)
          }
        })
      )

      navigate({ name: 'home' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!coffeeId) return
    setSaving(true)
    await window.api.coffee.delete(coffeeId)
    navigate({ name: 'list' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <>
      <div className="scrollable h-full px-8 py-6">
        <div className="max-w-3xl mx-auto pb-8">

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-3 mb-6 p-4 rounded-lg text-danger"
              style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', border: '1px solid var(--color-danger)' }}
            >
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>
          )}

          {/* ── Coffee details ──────────────────────────────────────────── */}
          <section className="card mb-6">
            <h2 className="text-text font-bold text-xl mb-5">Coffee Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="field-label">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  className="field-input"
                  placeholder="e.g. Ethiopia Yirgacheffe Natural"
                  value={fields.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Roaster</label>
                <input
                  className="field-input"
                  placeholder="e.g. Onyx Coffee Lab"
                  value={fields.roaster}
                  onChange={(e) => setField('roaster', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Origin</label>
                <input
                  className="field-input"
                  placeholder="e.g. Ethiopia, Yirgacheffe"
                  value={fields.origin}
                  onChange={(e) => setField('origin', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Roast Date</label>
                <input
                  className="field-input"
                  type="date"
                  value={fields.roast_date}
                  onChange={(e) => setField('roast_date', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Purchase Date</label>
                <input
                  className="field-input"
                  type="date"
                  value={fields.purchase_date}
                  onChange={(e) => setField('purchase_date', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Net Weight (g)</label>
                <input
                  className="field-input"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="250"
                  value={fields.net_weight_g}
                  onChange={(e) => setField('net_weight_g', e.target.value)}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-4 self-end pb-1">
                <label className="field-label mb-0">Status</label>
                <button
                  type="button"
                  className={`badge ${fields.is_active ? 'badge-active' : 'badge-inactive'} text-base px-4 py-2 cursor-pointer`}
                  style={{ minHeight: '48px' }}
                  onClick={() => setField('is_active', !fields.is_active)}
                >
                  {fields.is_active ? '● Active' : '● Finished'}
                </button>
              </div>

              <div className="col-span-2">
                <label className="field-label">Notes</label>
                <textarea
                  className="field-input resize-none"
                  rows={3}
                  placeholder="Tasting notes, processing method, roast level…"
                  value={fields.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ── Grind profiles ──────────────────────────────────────────── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text font-bold text-xl">
                Grind Profiles
                <span className="text-text-faint text-base font-normal ml-2">
                  ({profiles.length}/{MAX_PROFILES})
                </span>
              </h2>
              {profiles.length < MAX_PROFILES && (
                <button type="button" className="btn btn-ghost" onClick={addProfile}>
                  <Plus size={18} />
                  Add Profile
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {profiles.map((p, i) => (
                <ProfileForm
                  key={p._localId}
                  profile={p}
                  index={i}
                  onChange={(updated) => updateProfile(p._localId, updated)}
                  onDelete={() => removeProfile(p._localId)}
                />
              ))}
              {profiles.length === 0 && (
                <div
                  className="card text-center py-8 cursor-pointer"
                  style={{ borderStyle: 'dashed' }}
                  onClick={addProfile}
                >
                  <p className="text-text-muted mb-2">No grind profiles yet.</p>
                  <p className="text-text-faint text-sm">Tap to add one.</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Action buttons ──────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <button
              className="btn btn-primary flex-1 text-lg py-4"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={20} />
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Coffee'}
            </button>

            {isEditing && (
              <button
                className="btn btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
              >
                <Trash2 size={20} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Delete "${fields.name}"? This will also delete all its grind profiles and cannot be undone.`}
          confirmLabel="Delete Coffee"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
