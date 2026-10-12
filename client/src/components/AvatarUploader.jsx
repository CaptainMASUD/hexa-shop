import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Camera01Icon, Delete02Icon, UserIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { apiErrorMessage } from '../api/client'

export default function AvatarUploader({ size = 'lg', onUploaded }) {
  const { user, uploadAvatar, removeAvatar } = useAuth()
  const { notify } = useToast()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify('Image size must be less than 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      const updatedUser = await uploadAvatar(file)
      notify('Profile picture updated successfully', 'success')
      if (onUploaded) onUploaded(updatedUser)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to upload profile picture'), 'error')
    } finally {
      setUploading(false)
      // Reset input value so same file can be re-selected if desired
      e.target.value = ''
    }
  }

  const handleRemove = async () => {
    if (!user?.avatar?.url) return
    if (!window.confirm('Remove your profile picture?')) return

    setRemoving(true)
    try {
      const updatedUser = await removeAvatar()
      notify('Profile picture removed')
      if (onUploaded) onUploaded(updatedUser)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to remove profile picture'), 'error')
    } finally {
      setRemoving(false)
    }
  }

  const dimensionClass =
    size === 'sm'
      ? 'h-12 w-12 text-base'
      : size === 'md'
      ? 'h-16 w-16 text-xl'
      : 'h-24 w-24 text-3xl'

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Avatar Display Frame */}
      <div className="relative group">
        <div
          className={`relative ${dimensionClass} shrink-0 overflow-hidden rounded-2xl border-2 border-purple-500/30 bg-purple-500/10 text-purple-400 font-extrabold flex items-center justify-center shadow-md`}
        >
          {user?.avatar?.url ? (
            <img
              src={user.avatar.url}
              alt={user.name || 'User avatar'}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <span>{user?.name ? user.name.charAt(0).toUpperCase() : <HugeiconsIcon icon={UserIcon} size={24} />}</span>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 text-white">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
              <span className="text-[9px] font-bold">Uploading</span>
            </div>
          )}
        </div>

        {/* Quick Camera Overlay on hover */}
        {!uploading && (
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl bg-purple-600 text-white shadow-md hover:bg-purple-500 transition border border-black/20">
            <HugeiconsIcon icon={Camera01Icon} size={14} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              disabled={uploading || removing}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Action Buttons & Hint */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-500 transition">
            <HugeiconsIcon icon={Camera01Icon} size={14} />
            <span>{uploading ? 'Uploading to Cloudinary...' : 'Change Photo'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              disabled={uploading || removing}
              className="hidden"
            />
          </label>

          {user?.avatar?.url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition"
            >
              <HugeiconsIcon icon={Delete02Icon} size={13} />
              <span>{removing ? 'Removing...' : 'Remove'}</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--hexa-muted)]">
          Supports JPG, PNG, WEBP, or AVIF up to 5MB. Powered by Cloudinary.
        </p>
      </div>
    </div>
  )
}
