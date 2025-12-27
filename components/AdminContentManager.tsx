import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, TrendingUp, Newspaper, Award, Save, X, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { 
  getSuccessStories, 
  createSuccessStory, 
  updateSuccessStory, 
  deleteSuccessStory,
  getPressMentions,
  createPressMention,
  updatePressMention,
  deletePressMention
} from '../services/dbService';
import { SuccessStory, PressMention } from '../types';

interface AdminContentManagerProps {
  userRole: string;
}

const AdminContentManager: React.FC<AdminContentManagerProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'stories' | 'press'>('stories');
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [pressMentions, setPressMentions] = useState<PressMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form states for Success Story
  const [storyForm, setStoryForm] = useState<Partial<SuccessStory>>({
    title: '',
    description: '',
    organizer_name: '',
    organizer_role: '',
    event_type: '',
    avatar_url: '',
    quote: '',
    is_featured: false,
    is_active: true,
    display_order: 0,
    metrics: {}
  });

  // Form states for Press Mention
  const [pressForm, setPressForm] = useState<Partial<PressMention>>({
    publication_name: '',
    publication_logo_url: '',
    article_title: '',
    article_url: '',
    excerpt: '',
    published_date: new Date().toISOString().split('T')[0],
    author_name: '',
    category: '',
    is_featured: false,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    if (userRole === 'admin') {
      loadContent();
    }
  }, [userRole, activeTab]);

  const loadContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stories') {
        const stories = await getSuccessStories(100, false);
        setSuccessStories(stories);
      } else {
        const mentions = await getPressMentions(100, false);
        setPressMentions(mentions);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    try {
      const created = await createSuccessStory(storyForm);
      if (created) {
        setSuccessStories([...successStories, created]);
        resetStoryForm();
        setCreating(false);
      }
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };

  const handleUpdateStory = async (id: string) => {
    try {
      const updated = await updateSuccessStory(id, storyForm);
      if (updated) {
        setSuccessStories(successStories.map(s => s.id === id ? updated : s));
        setEditing(null);
        resetStoryForm();
      }
    } catch (error) {
      console.error('Error updating story:', error);
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this success story?')) return;
    
    try {
      const deleted = await deleteSuccessStory(id);
      if (deleted) {
        setSuccessStories(successStories.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  const handleCreatePress = async () => {
    try {
      const created = await createPressMention(pressForm);
      if (created) {
        setPressMentions([...pressMentions, created]);
        resetPressForm();
        setCreating(false);
      }
    } catch (error) {
      console.error('Error creating press mention:', error);
    }
  };

  const handleUpdatePress = async (id: string) => {
    try {
      const updated = await updatePressMention(id, pressForm);
      if (updated) {
        setPressMentions(pressMentions.map(p => p.id === id ? updated : p));
        setEditing(null);
        resetPressForm();
      }
    } catch (error) {
      console.error('Error updating press mention:', error);
    }
  };

  const handleDeletePress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this press mention?')) return;
    
    try {
      const deleted = await deletePressMention(id);
      if (deleted) {
        setPressMentions(pressMentions.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting press mention:', error);
    }
  };

  const resetStoryForm = () => {
    setStoryForm({
      title: '',
      description: '',
      organizer_name: '',
      organizer_role: '',
      event_type: '',
      avatar_url: '',
      quote: '',
      is_featured: false,
      is_active: true,
      display_order: 0,
      metrics: {}
    });
  };

  const resetPressForm = () => {
    setPressForm({
      publication_name: '',
      publication_logo_url: '',
      article_title: '',
      article_url: '',
      excerpt: '',
      published_date: new Date().toISOString().split('T')[0],
      author_name: '',
      category: '',
      is_featured: false,
      is_active: true,
      display_order: 0
    });
  };

  const startEditing = (item: SuccessStory | PressMention) => {
    setEditing(item.id);
    if (activeTab === 'stories') {
      setStoryForm(item as SuccessStory);
    } else {
      setPressForm(item as PressMention);
    }
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
          <h2 className="text-3xl font-black">Landing Page Content</h2>
          <p className="text-slate-400 mt-1">Manage success stories and press mentions</p>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            if (activeTab === 'stories') resetStoryForm();
            else resetPressForm();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add {activeTab === 'stories' ? 'Story' : 'Press'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('stories')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'stories'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award size={20} />
          Success Stories ({successStories.length})
        </button>
        <button
          onClick={() => setActiveTab('press')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'press'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Newspaper size={20} />
          Press Mentions ({pressMentions.length})
        </button>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">
              {creating ? 'Create' : 'Edit'} {activeTab === 'stories' ? 'Success Story' : 'Press Mention'}
            </h3>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
                if (activeTab === 'stories') resetStoryForm();
                else resetPressForm();
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {activeTab === 'stories' ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., From 50 to 5,000 Attendees"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Organizer Name *</label>
                  <input
                    type="text"
                    value={storyForm.organizer_name}
                    onChange={(e) => setStoryForm({ ...storyForm, organizer_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., John Smith"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Organizer Role</label>
                  <input
                    type="text"
                    value={storyForm.organizer_role}
                    onChange={(e) => setStoryForm({ ...storyForm, organizer_role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Festival Director"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Event Type</label>
                  <input
                    type="text"
                    value={storyForm.event_type}
                    onChange={(e) => setStoryForm({ ...storyForm, event_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Music Festival"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
                <textarea
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  rows={3}
                  placeholder="Brief description of their success..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Quote *</label>
                <textarea
                  value={storyForm.quote}
                  onChange={(e) => setStoryForm({ ...storyForm, quote: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  rows={2}
                  placeholder="Testimonial quote from the organizer..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={storyForm.avatar_url}
                  onChange={(e) => setStoryForm({ ...storyForm, avatar_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={storyForm.display_order}
                    onChange={(e) => setStoryForm({ ...storyForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storyForm.is_featured}
                      onChange={(e) => setStoryForm({ ...storyForm, is_featured: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-slate-300">Featured</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storyForm.is_active}
                      onChange={(e) => setStoryForm({ ...storyForm, is_active: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-slate-300">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => creating ? handleCreateStory() : handleUpdateStory(editing!)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  <Save size={20} />
                  {creating ? 'Create' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                    resetStoryForm();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Publication Name *</label>
                  <input
                    type="text"
                    value={pressForm.publication_name}
                    onChange={(e) => setPressForm({ ...pressForm, publication_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., TechCrunch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Publication Logo URL</label>
                  <input
                    type="url"
                    value={pressForm.publication_logo_url}
                    onChange={(e) => setPressForm({ ...pressForm, publication_logo_url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Article Title *</label>
                <input
                  type="text"
                  value={pressForm.article_title}
                  onChange={(e) => setPressForm({ ...pressForm, article_title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., EventNexus Raises €2M to Revolutionize Event Discovery"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Article URL *</label>
                <input
                  type="url"
                  value={pressForm.article_url}
                  onChange={(e) => setPressForm({ ...pressForm, article_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Excerpt</label>
                <textarea
                  value={pressForm.excerpt}
                  onChange={(e) => setPressForm({ ...pressForm, excerpt: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  rows={2}
                  placeholder="Brief excerpt from the article..."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Published Date *</label>
                  <input
                    type="date"
                    value={pressForm.published_date}
                    onChange={(e) => setPressForm({ ...pressForm, published_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Author Name</label>
                  <input
                    type="text"
                    value={pressForm.author_name}
                    onChange={(e) => setPressForm({ ...pressForm, author_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                  <input
                    type="text"
                    value={pressForm.category}
                    onChange={(e) => setPressForm({ ...pressForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Tech News"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={pressForm.display_order}
                    onChange={(e) => setPressForm({ ...pressForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pressForm.is_featured}
                      onChange={(e) => setPressForm({ ...pressForm, is_featured: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-slate-300">Featured</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pressForm.is_active}
                      onChange={(e) => setPressForm({ ...pressForm, is_active: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-slate-300">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => creating ? handleCreatePress() : handleUpdatePress(editing!)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  <Save size={20} />
                  {creating ? 'Create' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                    resetPressForm();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'stories' ? (
            successStories.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <Award className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No success stories yet</p>
                <p className="text-slate-500 text-sm mt-2">Add your first success story to showcase on the landing page</p>
              </div>
            ) : (
              successStories.map((story) => (
                <div key={story.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{story.title}</h3>
                        {story.is_featured && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star size={12} className="fill-current" /> Featured
                          </span>
                        )}
                        {!story.is_active && (
                          <span className="bg-slate-700 text-slate-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <EyeOff size={12} /> Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 mb-2">{story.description}</p>
                      <p className="text-slate-500 italic text-sm mb-3">"{story.quote}"</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="font-semibold">{story.organizer_name}</span>
                        {story.organizer_role && <span>• {story.organizer_role}</span>}
                        {story.event_type && <span>• {story.event_type}</span>}
                        <span>• Order: {story.display_order}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(story)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            pressMentions.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <Newspaper className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No press mentions yet</p>
                <p className="text-slate-500 text-sm mt-2">Add your first press mention to showcase media coverage</p>
              </div>
            ) : (
              pressMentions.map((mention) => (
                <div key={mention.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{mention.article_title}</h3>
                        {mention.is_featured && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star size={12} className="fill-current" /> Featured
                          </span>
                        )}
                        {!mention.is_active && (
                          <span className="bg-slate-700 text-slate-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <EyeOff size={12} /> Inactive
                          </span>
                        )}
                      </div>
                      {mention.excerpt && <p className="text-slate-400 mb-3">{mention.excerpt}</p>}
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="font-semibold">{mention.publication_name}</span>
                        {mention.author_name && <span>• {mention.author_name}</span>}
                        {mention.category && <span>• {mention.category}</span>}
                        <span>• {new Date(mention.published_date).toLocaleDateString()}</span>
                        <span>• Order: {mention.display_order}</span>
                      </div>
                      <a
                        href={mention.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
                      >
                        View Article →
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(mention)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePress(mention.id)}
                        className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
};

export default AdminContentManager;
