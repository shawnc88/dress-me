import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useRef, ChangeEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ImagePlus, X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CreatePost() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  function clearImage() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePost() {
    if (!file) return;
    setPosting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      if (caption.trim()) formData.append('caption', caption.trim());

      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to create post');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <Layout>
      <Head>
        <title>Create Post - Dress Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <h1 className="text-base font-semibold">New Post</h1>
          <button
            onClick={handlePost}
            disabled={!file || posting}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            {posting ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Image Upload Area */}
        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors cursor-pointer"
          >
            <ImagePlus className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Tap to upload a photo</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF up to 10MB</p>
            </div>
          </button>
        ) : (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full aspect-square object-cover rounded-lg" />
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Caption */}
        {preview && (
          <div className="mt-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={2200}
              rows={4}
              className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none outline-none placeholder-gray-400 dark:placeholder-gray-500"
            />
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
              <span className="text-xs text-gray-400">{caption.length}/2,200</span>
            </div>
          </div>
        )}

        {/* Posting overlay */}
        {posting && (
          <div className="fixed inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Sharing your post...</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
