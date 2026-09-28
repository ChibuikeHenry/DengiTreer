import { useCallback, useEffect, useState } from 'react'
import { validateProfilePhoto } from '../lib/profilePhoto'

export function usePhotoPicker() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const reset = useCallback(() => {
    setFile(null)
    setError('')
  }, [])

  const selectFile = useCallback((next: File | null) => {
    setError('')
    if (!next) {
      setFile(null)
      return
    }
    const validationError = validateProfilePhoto(next)
    if (validationError) {
      setError(validationError)
      return
    }
    setFile(next)
  }, [])

  return { file, previewUrl, error, selectFile, reset }
}
