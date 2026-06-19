export interface Video {
  id: string
  title: string
  file_path: string
  file_size: number
  folder: string
  user_email: string
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  name: string
  email: string
}

export interface User {
  id: string
  email: string
}