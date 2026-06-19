-- Clean existing data (run these commands if migrating from previous system)
-- DELETE FROM videos;
-- DELETE FROM storage.objects WHERE bucket_id = 'videos';
-- ALTER TABLE videos ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT '';
-- 
-- Note: Also manually clear the 'videos' storage bucket in Supabase dashboard
-- or use the Supabase CLI: supabase storage empty videos

-- Create videos table
CREATE TABLE videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  folder TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォルダの動画を閲覧可能（管理者は全て閲覧可能）
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@example.com' OR
    auth.jwt() ->> 'email' = 'coach@example.com' OR
    folder IN (
      CASE auth.jwt() ->> 'email'
        WHEN 'player001@example.com' THEN 'player001'
        WHEN 'player002@example.com' THEN 'player002'
        WHEN 'player003@example.com' THEN 'player003'
        WHEN 'player004@example.com' THEN 'player004'
        WHEN 'player005@example.com' THEN 'player005'
        WHEN 'player006@example.com' THEN 'player006'
        WHEN 'player007@example.com' THEN 'player007'
        WHEN 'player008@example.com' THEN 'player008'
        WHEN 'player009@example.com' THEN 'player009'
        WHEN 'player010@example.com' THEN 'player010'
        WHEN 'player011@example.com' THEN 'player011'
        WHEN 'player012@example.com' THEN 'player012'
        WHEN 'player013@example.com' THEN 'player013'
        WHEN 'player014@example.com' THEN 'player014'
        WHEN 'player015@example.com' THEN 'player015'
        WHEN 'player016@example.com' THEN 'player016'
        WHEN 'player017@example.com' THEN 'player017'
        WHEN 'player018@example.com' THEN 'player018'
        WHEN 'player019@example.com' THEN 'player019'
        WHEN 'player020@example.com' THEN 'player020'
        WHEN 'player021@example.com' THEN 'player021'
        WHEN 'player022@example.com' THEN 'player022'
        WHEN 'player023@example.com' THEN 'player023'
        WHEN 'player024@example.com' THEN 'player024'
        WHEN 'player025@example.com' THEN 'player025'
        WHEN 'player026@example.com' THEN 'player026'
        WHEN 'player027@example.com' THEN 'player027'
        WHEN 'player028@example.com' THEN 'player028'
        WHEN 'player029@example.com' THEN 'player029'
        WHEN 'player030@example.com' THEN 'player030'
      END
    )
  );

-- ユーザーは自分のアカウント用フォルダにのみアップロード可能（管理者は全フォルダ可能）
CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = user_email AND
    (
      auth.jwt() ->> 'email' = 'admin@example.com' OR
      auth.jwt() ->> 'email' = 'coach@example.com' OR
      folder IN (
        CASE auth.jwt() ->> 'email'
          WHEN 'player001@example.com' THEN 'player001'
          WHEN 'player002@example.com' THEN 'player002'
          WHEN 'player003@example.com' THEN 'player003'
          WHEN 'player004@example.com' THEN 'player004'
          WHEN 'player005@example.com' THEN 'player005'
          WHEN 'player006@example.com' THEN 'player006'
          WHEN 'player007@example.com' THEN 'player007'
          WHEN 'player008@example.com' THEN 'player008'
          WHEN 'player009@example.com' THEN 'player009'
          WHEN 'player010@example.com' THEN 'player010'
          WHEN 'player011@example.com' THEN 'player011'
          WHEN 'player012@example.com' THEN 'player012'
          WHEN 'player013@example.com' THEN 'player013'
          WHEN 'player014@example.com' THEN 'player014'
          WHEN 'player015@example.com' THEN 'player015'
          WHEN 'player016@example.com' THEN 'player016'
          WHEN 'player017@example.com' THEN 'player017'
          WHEN 'player018@example.com' THEN 'player018'
          WHEN 'player019@example.com' THEN 'player019'
          WHEN 'player020@example.com' THEN 'player020'
          WHEN 'player021@example.com' THEN 'player021'
          WHEN 'player022@example.com' THEN 'player022'
          WHEN 'player023@example.com' THEN 'player023'
          WHEN 'player024@example.com' THEN 'player024'
          WHEN 'player025@example.com' THEN 'player025'
          WHEN 'player026@example.com' THEN 'player026'
          WHEN 'player027@example.com' THEN 'player027'
          WHEN 'player028@example.com' THEN 'player028'
          WHEN 'player029@example.com' THEN 'player029'
          WHEN 'player030@example.com' THEN 'player030'
        END
      ) OR folder = 'admin'
    )
  );

-- ユーザーは自分がアップロードした動画のみ削除可能（管理者は全て削除可能）
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = user_email OR 
    auth.jwt() ->> 'email' = 'admin@example.com' OR
    auth.jwt() ->> 'email' = 'coach@example.com'
  );

-- Create storage bucket for videos (既に存在する場合はスキップ)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- ストレージRLSポリシー: ユーザーは自分の動画のみアクセス可能（管理者は全てアクセス可能）
CREATE POLICY "Users can view own video files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'videos' AND
    (
      auth.jwt() ->> 'email' = 'admin@example.com' OR
      auth.jwt() ->> 'email' = 'coach@example.com' OR
      name LIKE (
        CASE auth.jwt() ->> 'email'
          WHEN 'player001@example.com' THEN 'player001/%'
          WHEN 'player002@example.com' THEN 'player002/%'
          WHEN 'player003@example.com' THEN 'player003/%'
          WHEN 'player004@example.com' THEN 'player004/%'
          WHEN 'player005@example.com' THEN 'player005/%'
          WHEN 'player006@example.com' THEN 'player006/%'
          WHEN 'player007@example.com' THEN 'player007/%'
          WHEN 'player008@example.com' THEN 'player008/%'
          WHEN 'player009@example.com' THEN 'player009/%'
          WHEN 'player010@example.com' THEN 'player010/%'
          WHEN 'player011@example.com' THEN 'player011/%'
          WHEN 'player012@example.com' THEN 'player012/%'
          WHEN 'player013@example.com' THEN 'player013/%'
          WHEN 'player014@example.com' THEN 'player014/%'
          WHEN 'player015@example.com' THEN 'player015/%'
          WHEN 'player016@example.com' THEN 'player016/%'
          WHEN 'player017@example.com' THEN 'player017/%'
          WHEN 'player018@example.com' THEN 'player018/%'
          WHEN 'player019@example.com' THEN 'player019/%'
          WHEN 'player020@example.com' THEN 'player020/%'
          WHEN 'player021@example.com' THEN 'player021/%'
          WHEN 'player022@example.com' THEN 'player022/%'
          WHEN 'player023@example.com' THEN 'player023/%'
          WHEN 'player024@example.com' THEN 'player024/%'
          WHEN 'player025@example.com' THEN 'player025/%'
          WHEN 'player026@example.com' THEN 'player026/%'
          WHEN 'player027@example.com' THEN 'player027/%'
          WHEN 'player028@example.com' THEN 'player028/%'
          WHEN 'player029@example.com' THEN 'player029/%'
          WHEN 'player030@example.com' THEN 'player030/%'
        END
      ) OR name LIKE 'admin/%'
    )
  );

CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND
    (
      auth.jwt() ->> 'email' = 'admin@example.com' OR
      auth.jwt() ->> 'email' = 'coach@example.com' OR
      name LIKE (
        CASE auth.jwt() ->> 'email'
          WHEN 'player001@example.com' THEN 'player001/%'
          WHEN 'player002@example.com' THEN 'player002/%'
          WHEN 'player003@example.com' THEN 'player003/%'
          WHEN 'player004@example.com' THEN 'player004/%'
          WHEN 'player005@example.com' THEN 'player005/%'
          WHEN 'player006@example.com' THEN 'player006/%'
          WHEN 'player007@example.com' THEN 'player007/%'
          WHEN 'player008@example.com' THEN 'player008/%'
          WHEN 'player009@example.com' THEN 'player009/%'
          WHEN 'player010@example.com' THEN 'player010/%'
          WHEN 'player011@example.com' THEN 'player011/%'
          WHEN 'player012@example.com' THEN 'player012/%'
          WHEN 'player013@example.com' THEN 'player013/%'
          WHEN 'player014@example.com' THEN 'player014/%'
          WHEN 'player015@example.com' THEN 'player015/%'
          WHEN 'player016@example.com' THEN 'player016/%'
          WHEN 'player017@example.com' THEN 'player017/%'
          WHEN 'player018@example.com' THEN 'player018/%'
          WHEN 'player019@example.com' THEN 'player019/%'
          WHEN 'player020@example.com' THEN 'player020/%'
          WHEN 'player021@example.com' THEN 'player021/%'
          WHEN 'player022@example.com' THEN 'player022/%'
          WHEN 'player023@example.com' THEN 'player023/%'
          WHEN 'player024@example.com' THEN 'player024/%'
          WHEN 'player025@example.com' THEN 'player025/%'
          WHEN 'player026@example.com' THEN 'player026/%'
          WHEN 'player027@example.com' THEN 'player027/%'
          WHEN 'player028@example.com' THEN 'player028/%'
          WHEN 'player029@example.com' THEN 'player029/%'
          WHEN 'player030@example.com' THEN 'player030/%'
        END
      ) OR name LIKE 'admin/%'
    )
  );

CREATE POLICY "Users can delete own video files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos' AND
    (
      auth.jwt() ->> 'email' = 'admin@example.com' OR
      auth.jwt() ->> 'email' = 'coach@example.com' OR
      name LIKE (
        CASE auth.jwt() ->> 'email'
          WHEN 'player001@example.com' THEN 'player001/%'
          WHEN 'player002@example.com' THEN 'player002/%'
          WHEN 'player003@example.com' THEN 'player003/%'
          WHEN 'player004@example.com' THEN 'player004/%'
          WHEN 'player005@example.com' THEN 'player005/%'
          WHEN 'player006@example.com' THEN 'player006/%'
          WHEN 'player007@example.com' THEN 'player007/%'
          WHEN 'player008@example.com' THEN 'player008/%'
          WHEN 'player009@example.com' THEN 'player009/%'
          WHEN 'player010@example.com' THEN 'player010/%'
          WHEN 'player011@example.com' THEN 'player011/%'
          WHEN 'player012@example.com' THEN 'player012/%'
          WHEN 'player013@example.com' THEN 'player013/%'
          WHEN 'player014@example.com' THEN 'player014/%'
          WHEN 'player015@example.com' THEN 'player015/%'
          WHEN 'player016@example.com' THEN 'player016/%'
          WHEN 'player017@example.com' THEN 'player017/%'
          WHEN 'player018@example.com' THEN 'player018/%'
          WHEN 'player019@example.com' THEN 'player019/%'
          WHEN 'player020@example.com' THEN 'player020/%'
          WHEN 'player021@example.com' THEN 'player021/%'
          WHEN 'player022@example.com' THEN 'player022/%'
          WHEN 'player023@example.com' THEN 'player023/%'
          WHEN 'player024@example.com' THEN 'player024/%'
          WHEN 'player025@example.com' THEN 'player025/%'
          WHEN 'player026@example.com' THEN 'player026/%'
          WHEN 'player027@example.com' THEN 'player027/%'
          WHEN 'player028@example.com' THEN 'player028/%'
          WHEN 'player029@example.com' THEN 'player029/%'
          WHEN 'player030@example.com' THEN 'player030/%'
        END
      ) OR name LIKE 'admin/%'
    )
  );