import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Auth/Login'
import Header from './components/Layout/Header'
import FolderList from './components/Folders/FolderList'
import VideoUpload from './components/Upload/VideoUpload'
import VideoList from './components/Videos/VideoList'
import { useDatabase } from './hooks/useDatabase'
import './App.css'

const MainApp: React.FC = () => {
  const { user, loading } = useAuth()
  const { getUserFolder, folders, isAdmin } = useDatabase()
  const [userFolder, setUserFolder] = useState<{ id: string; name: string; email: string } | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [loadingFolder, setLoadingFolder] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showUploadAdmin, setShowUploadAdmin] = useState(false)
  
  useEffect(() => {
    if (user) {
      const adminStatus = isAdmin(user.email)
      setIsUserAdmin(adminStatus)
      
      if (adminStatus) {
        // 管理者の場合はフォルダ選択モード
        setUserFolder(null)
      } else {
        // 一般ユーザーの場合は自分のフォルダのみ
        const folder = getUserFolder(user.email)
        setUserFolder(folder)
      }
    }
    setLoadingFolder(false)
  }, [user, getUserFolder, isAdmin])

  if (loading || loadingFolder) {
    return <div className="loading">読み込み中...</div>
  }

  if (!user) {
    return <Login />
  }

  const handleUploadComplete = () => {
    // リフレッシュキーを更新してVideoListを再レンダリング
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="container">
          {isUserAdmin ? (
            // 管理者モード: 2カラム + モバイルはタブ切替
            <div className="admin-layout">
              <aside className="admin-sidebar hidden-mobile">
                <FolderList 
                  folders={folders}
                  selectedFolder={selectedFolder}
                  onFolderSelect={setSelectedFolder}
                />
              </aside>
              <section className="admin-content">
                <div className="admin-tabs">
                  <button
                    className={`admin-tab-btn ${!selectedFolder ? 'active' : ''}`}
                    onClick={() => setSelectedFolder(null)}
                  >
                    フォルダ
                  </button>
                  <button
                    className={`admin-tab-btn ${selectedFolder ? 'active' : ''}`}
                    onClick={() => {
                      if (!selectedFolder && folders[0]) setSelectedFolder(folders[0].id)
                    }}
                  >
                    動画
                  </button>
                </div>

                {!selectedFolder ? (
                  <div className="admin-placeholder">
                    <div className="admin-info" style={{marginBottom: '12px'}}>
                      <h2>管理者モード</h2>
                      <p>左のフォルダ一覧から選択してください</p>
                    </div>
                    {/* モバイルでは上のタブから「動画」を選択してください */}
                    <FolderList 
                      folders={folders}
                      selectedFolder={selectedFolder}
                      onFolderSelect={setSelectedFolder}
                    />
                  </div>
                ) : (
                  <>
                    <div className="admin-toolbar">
                      <h2 className="admin-folder-title">
                        {
                          (folders.find(f => f.id === selectedFolder)?.name) || '選択フォルダ'
                        }
                      </h2>
                      <button className="primary-btn" onClick={() => setShowUploadAdmin(true)}>アップロード</button>
                    </div>
                    <VideoList key={refreshKey} selectedFolder={selectedFolder} />
                    {showUploadAdmin && (
                      <div className="modal-backdrop" onClick={() => setShowUploadAdmin(false)}>
                        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                          <div className="modal-header">
                            <h3>動画アップロード</h3>
                            <button className="modal-close" aria-label="閉じる" onClick={() => setShowUploadAdmin(false)}>×</button>
                          </div>
                          <VideoUpload 
                            selectedFolder={selectedFolder}
                            onUploadComplete={() => {
                              setShowUploadAdmin(false)
                              handleUploadComplete()
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          ) : userFolder ? (
            // 一般ユーザーモード: 自分のフォルダのみ
            <>
              <div className="user-folder-info">
                <h2>{userFolder.name}のフォルダ</h2>
                <p>あなたのアカウント: {userFolder.email}</p>
              </div>
              <VideoUpload 
                selectedFolder={userFolder.id}
                onUploadComplete={handleUploadComplete} 
              />
              <VideoList key={refreshKey} selectedFolder={userFolder.id} />
            </>
          ) : (
            <div className="no-folder-error">
              <h2>アクセスエラー</h2>
              <p>あなたのアカウントはこのアプリケーションへのアクセスが許可されていません。</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}

export default App