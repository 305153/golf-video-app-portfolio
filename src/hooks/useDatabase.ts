import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Video, Folder } from '../types'

const FOLDERS: Folder[] = [
  { id: 'admin', name: '管理者', email: 'admin@example.com' },
  ...Array.from({ length: 30 }, (_, index) => {
    const playerNumber = String(index + 1).padStart(3, '0')
    return {
      id: `player${playerNumber}`,
      name: `選手${index + 1}`,
      email: `player${playerNumber}@example.com`,
    }
  }),
]

const ADMIN_EMAILS = ['admin@example.com', 'coach@example.com']

export const useDatabase = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  
  const getUserFolder = (email?: string | null): Folder | null => {
    if (!email) return null
    
    // 管理者の場合はnullを返して全フォルダアクセスを許可
    if (ADMIN_EMAILS.includes(email)) return null
    
    return FOLDERS.find(f => f.email === email) || null
  }
  
  const isAdmin = (email?: string | null): boolean => {
    return email ? ADMIN_EMAILS.includes(email) : false
  }

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadVideo = async (file: File, title: string, folder: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('ユーザー情報が取得できません')
    try {
      const fileExt = file.name.split('.').pop()
      const uniqueId = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? globalThis.crypto.randomUUID() : String(Date.now())
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'misc'
      const fileName = `${safeFolder}/${uniqueId}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('videos')
        .insert([
          {
            title,
            file_path: fileName,
            file_size: file.size,
            folder,
            user_email: user.email,
          },
        ])
        .select()

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error uploading video:', error)
      throw error
    }
  }

  const deleteVideo = async (videoId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('videos')
        .remove([filePath])

      if (storageError) throw storageError

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting video:', error)
      throw error
    }
  }

  const getVideoUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath)
    return data.publicUrl
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  return {
    videos,
    loading,
    folders: FOLDERS,
    getUserFolder,
    isAdmin,
    uploadVideo,
    deleteVideo,
    getVideoUrl,
    refetchVideos: fetchVideos,
  }
}