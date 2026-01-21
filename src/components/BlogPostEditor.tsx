import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Eye, Send, Image as ImageIcon, Tag, X } from 'lucide-react';
import { createBlogPost, publishBlogPost } from '../services/blogService';

export default function BlogPostEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  
  const [formData, setFormData] = useState({
    title: { en: '', et: '', ru: '' },
    content: { en: '', et: '', ru: '' },
    excerpt: { en: '', et: '', ru: '' },
    category: '',
    tags: [] as string[],
    cover_image_url: '',
    meta_title: { en: '', et: '', ru: '' },
    meta_description: { en: '', et: '', ru: '' },
    meta_keywords: [] as string[],
    allow_comments: true,
    post_type: 'user_post'
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentLang, setCurrentLang] = useState<'en' | 'et' | 'ru'>('en');

  const categories = [
    'Updates',
    'Tutorials',
    'News',
    'Community',
    'Events',
    'Tips',
    'Announcement'
  ];

  async function handleSaveDraft() {
    try {
      setLoading(true);
      const post = await createBlogPost({
        ...formData,
        status: 'draft'
      });
      alert('Draft saved!');
      navigate(`/blog/${post.slug}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    try {
      setLoading(true);
      const post = await createBlogPost({
        ...formData,
        status: 'published',
        published_at: new Date().toISOString()
      });
      alert('Post published!');
      navigate(`/blog/${post.slug}`);
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Failed to publish post');
    } finally {
      setLoading(false);
    }
  }

  function addTag() {
    if (currentTag && !formData.tags.includes(currentTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, currentTag]
      });
      setCurrentTag('');
    }
  }

  function removeTag(tag: string) {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  }

  function addKeyword() {
    if (currentKeyword && !formData.meta_keywords.includes(currentKeyword)) {
      setFormData({
        ...formData,
        meta_keywords: [...formData.meta_keywords, currentKeyword]
      });
      setCurrentKeyword('');
    }
  }

  function removeKeyword(keyword: string) {
    setFormData({
      ...formData,
      meta_keywords: formData.meta_keywords.filter(k => k !== keyword)
    });
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-50">Create Post</h1>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    activeTab === 'edit'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-all border border-slate-700"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              
              <button
                onClick={handlePublish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Language selector */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Language
              </label>
              <div className="flex gap-2">
                {(['en', 'et', 'ru'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCurrentLang(lang)}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${
                      currentLang === lang
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Title ({currentLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={formData.title[currentLang]}
                onChange={(e) => setFormData({
                  ...formData,
                  title: { ...formData.title, [currentLang]: e.target.value }
                })}
                placeholder="Enter post title..."
                className="w-full text-2xl font-bold px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-600"
              />
            </div>

            {/* Cover image */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Cover Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 placeholder-slate-600"
                />
                <button className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700">
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              {formData.cover_image_url && (
                <img
                  src={formData.cover_image_url}
                  alt="Cover preview"
                  className="mt-4 w-full rounded-lg"
                />
              )}
            </div>

            {/* Content */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Content ({currentLang.toUpperCase()})
              </label>
              <textarea
                value={formData.content[currentLang]}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, [currentLang]: e.target.value }
                })}
                placeholder="Write your post content... (Supports Markdown)"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-slate-200 placeholder-slate-600"
                rows={20}
              />
            </div>

            {/* Excerpt */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Excerpt ({currentLang.toUpperCase()})
              </label>
              <textarea
                value={formData.excerpt[currentLang]}
                onChange={(e) => setFormData({
                  ...formData,
                  excerpt: { ...formData.excerpt, [currentLang]: e.target.value }
                })}
                placeholder="Short description for previews..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 placeholder-slate-600"
                rows={3}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-200 placeholder-slate-600"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-600/20"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm border border-indigo-500/30"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-indigo-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* SEO */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-300 mb-4">SEO Settings</h3>
              
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Meta Title ({currentLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={formData.meta_title[currentLang]}
                onChange={(e) => setFormData({
                  ...formData,
                  meta_title: { ...formData.meta_title, [currentLang]: e.target.value }
                })}
                placeholder="SEO title..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm mb-3 text-slate-200 placeholder-slate-600"
              />

              <label className="block text-xs font-bold text-slate-400 mb-2">
                Meta Description ({currentLang.toUpperCase()})
              </label>
              <textarea
                value={formData.meta_description[currentLang]}
                onChange={(e) => setFormData({
                  ...formData,
                  meta_description: { ...formData.meta_description, [currentLang]: e.target.value }
                })}
                placeholder="SEO description..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm mb-3 text-slate-200 placeholder-slate-600"
                rows={3}
              />

              <label className="block text-xs font-medium text-gray-700 mb-2">
                Keywords
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentKeyword}
                  onChange={(e) => setCurrentKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder="Add keyword..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={addKeyword}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.meta_keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="hover:text-gray-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Settings</h3>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_comments}
                  onChange={(e) => setFormData({ ...formData, allow_comments: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Allow comments</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
