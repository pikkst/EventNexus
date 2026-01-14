import React, { useState, useEffect } from 'react';
import { Play, Edit2, Trash2, Save, X, Eye, EyeOff, Plus, Video, ExternalLink } from 'lucide-react';
import {
  getPlatformMedia,
  getAllPlatformMedia,
  createPlatformMedia,
  updatePlatformMedia,
  deletePlatformMedia
} from '../services/dbService';
import { PlatformMedia } from '../types';

interface AdminMediaManagerProps {
  userRole: string;
}

const AdminMediaManager: React.FC<AdminMediaManagerProps> = ({ userRole }) => {
  const [mediaList, setMediaList] = useState<PlatformMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [mediaForm, setMediaForm] = useState<Partial<PlatformMedia>>({
    media_type: 'walkthrough_video',
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    is_active: false,
    display_location: 'landing_demo',
    display_order: 0,
    metadata: {}
  });

  useEffect(() => {
    if (userRole === 'admin') {
      loadMedia();
    }
  }, [userRole]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const media = await getAllPlatformMedia();
      setMediaList(media);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const created = await createPlatformMedia(mediaForm);
      if (created) {
        setMediaList([...mediaList, created]);
        resetForm();
        setCreating(false);
      }
    } catch (error) {
      console.error('Error creating media:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const updated = await updatePlatformMedia(id, mediaForm);
      if (updated) {
        setMediaList(mediaList.map(m => m.id === id ? updated : m));
        setEditing(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating media:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    try {
      const deleted = await deletePlatformMedia(id);
      if (deleted) {
        setMediaList(mediaList.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const handleToggleActive = async (media: PlatformMedia) => {
    try {
      const updated = await updatePlatformMedia(media.id, { is_active: !media.is_active });
      if (updated) {
        setMediaList(mediaList.map(m => m.id === media.id ? updated : m));
      }
    } catch (error) {
      console.error('Error toggling media active status:', error);
    }
  };

  const resetForm = () => {
    setMediaForm({
      media_type: 'walkthrough_video',
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      duration: '',
      is_active: false,
      display_location: 'landing_demo',
      display_order: 0,
      metadata: {}
    });
  };

  const startEditing = (media: PlatformMedia) => {
    setEditing(media.id);
    setMediaForm(media);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black">Platform Media Manager</h2>
          <p className="text-slate-400 mt-1">Manage videos, demos, and tutorials</p>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            resetForm();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Media
        </button>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">
              {creating ? 'Add New Media' : 'Edit Media'}
            </h3>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
                resetForm();
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Media Type *</label>
                <select
                  value={mediaForm.media_type}
                  onChange={(e) => setMediaForm({ ...mediaForm, media_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="walkthrough_video">Platform Walkthrough</option>
                  <option value="demo_video">Demo Video</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="feature_highlight">Feature Highlight</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Display Location *</label>
                <select
                  value={mediaForm.display_location}
                  onChange={(e) => setMediaForm({ ...mediaForm, display_location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="landing_demo">Landing Page - Demo Section</option>
                  <option value="help_center">Help Center</option>
                  <option value="dashboard">Dashboard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Title *</label>
              <input
                type="text"
                value={mediaForm.title}
                onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g., Platform Walkthrough"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
              <textarea
                value={mediaForm.description}
                onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                rows={2}
                placeholder="Brief description of the video..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Video URL * (YouTube, Vimeo, or direct link)</label>
              <input
                type="url"
                value={mediaForm.video_url}
                onChange={(e) => setMediaForm({ ...mediaForm, video_url: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Thumbnail URL</label>
                <input
                  type="url"
                  value={mediaForm.thumbnail_url}
                  onChange={(e) => setMediaForm({ ...mediaForm, thumbnail_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Duration</label>
                <input
                  type="text"
                  value={mediaForm.duration}
                  onChange={(e) => setMediaForm({ ...mediaForm, duration: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., 3:45"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Display Order</label>
                <input
                  type="number"
                  value={mediaForm.display_order}
                  onChange={(e) => setMediaForm({ ...mediaForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediaForm.is_active}
                    onChange={(e) => setMediaForm({ ...mediaForm, is_active: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-bold text-slate-300">Active (Show on landing page)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => creating ? handleCreate() : handleUpdate(editing!)}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
              >
                <Save size={20} />
                {creating ? 'Create' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                  resetForm();
                }}
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {mediaList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <Video className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">No media added yet</p>
              <p className="text-slate-500 text-sm mt-2">Add your first video or demo</p>
            </div>
          ) : (
            mediaList.map((media) => (
              <div key={media.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail/Preview */}
                  <div className="md:w-1/3 bg-slate-950 relative">
                    {media.video_url ? (
                      <div className="aspect-video relative">
                        {media.thumbnail_url ? (
                          <img src={media.thumbnail_url} alt={media.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <Play className="w-12 h-12 text-slate-700" />
                          </div>
                        )}
                        <a
                          href={media.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                            <ExternalLink className="w-8 h-8 text-slate-950" />
                          </div>
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-slate-900">
                        <Video className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{media.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            media.is_active 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {media.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {media.description && (
                          <p className="text-slate-400 mb-3">{media.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          <span className="font-semibold capitalize">{media.media_type.replace('_', ' ')}</span>
                          {media.duration && <span>• {media.duration}</span>}
                          <span>• {media.display_location.replace('_', ' ')}</span>
                          <span>• Order: {media.display_order}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(media)}
                          className={`p-2 rounded-lg transition-colors ${
                            media.is_active 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-slate-800 hover:bg-slate-700'
                          }`}
                          title={media.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {media.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => startEditing(media)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(media.id)}
                          className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMediaManager;
