import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  BookmarkPlus,
  Calendar,
  Eye,
  TrendingUp,
  Sparkles,
  User,
  Tag
} from 'lucide-react';
import { getBlogPosts, getTrendingPosts, getFeaturedPosts, getAdminUpdates } from '../services/blogService';

interface BlogPost {
  id: string;
  title: { en: string; et: string; ru: string };
  slug: string;
  excerpt?: { en: string; et: string; ru: string };
  cover_image_url?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category?: string;
  tags?: string[];
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_featured?: boolean;
  is_pinned?: boolean;
  post_type?: string;
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [adminUpdates, setAdminUpdates] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'following' | 'updates'>('all');
  const navigate = useNavigate();

  const language = 'en'; // Get from context/props

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, selectedTag, activeTab]);

  async function loadPosts() {
    try {
      setLoading(true);
      
      const [postsData, trendingData, featuredData, updatesData] = await Promise.all([
        getBlogPosts({ 
          category: selectedCategory || undefined, 
          tag: selectedTag || undefined,
          limit: 20 
        }),
        getTrendingPosts(5),
        getFeaturedPosts(3),
        getAdminUpdates(5)
      ]);

      setPosts(postsData || []);
      setTrendingPosts(trendingData || []);
      setFeaturedPosts(featuredData || []);
      setAdminUpdates(updatesData || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('et-EE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const BlogPostCard = ({ post }: { post: BlogPost }) => (
    <Link
      to={`/blog/${post.slug}`}
      className="group block bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-indigo-600/20"
    >
      {post.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title[language]}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="p-6">
        {/* Meta info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-8 h-8 rounded-full border-2 border-indigo-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <span className="text-sm font-medium text-slate-300">
              {post.author.name}
            </span>
          </div>
          
          {post.category && (
            <span className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/30">
              {post.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-indigo-400 transition-colors">
          {post.title[language]}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-slate-400 mb-4 line-clamp-2">
            {post.excerpt[language]}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded border border-slate-700"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1 hover:text-indigo-400 transition-colors">
              <Eye className="w-4 h-4" />
              {formatNumber(post.view_count)}
            </span>
            <span className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Heart className="w-4 h-4" />
              {formatNumber(post.like_count)}
            </span>
            <span className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              {formatNumber(post.comment_count)}
            </span>
          </div>
          
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(post.published_at)}
          </span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">EventNexus Blog</h1>
              <p className="text-indigo-100 text-lg">
                Updates, tutorials, and community stories
              </p>
            </div>
            <button
              onClick={() => navigate('/blog/new')}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all hover:scale-105 shadow-xl shadow-indigo-600/20"
            >
              Write a Post
            </button>
          </div>

        </div>
        {/* Tabs */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 -mb-px border-b border-indigo-400/30">
            {[
              { id: 'all', label: 'All Posts', icon: Sparkles },
              { id: 'trending', label: 'Trending', icon: TrendingUp },
              { id: 'following', label: 'Following', icon: User },
              { id: 'updates', label: 'Platform Updates', icon: Calendar }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-bold transition-all border-b-2 ${
                  activeTab === id
                    ? 'border-white text-white'
                    : 'border-transparent text-indigo-200 hover:text-white hover:border-indigo-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Featured posts */}
            {activeTab === 'all' && featuredPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  Featured Posts
                </h2>
                <div className="grid gap-6">
                  {featuredPosts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Admin updates */}
            {activeTab === 'updates' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-50 mb-4">
                  Platform Updates
                </h2>
                {adminUpdates.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No updates yet</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {adminUpdates.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All posts */}
            {activeTab === 'all' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-50 mb-4">
                  Latest Posts
                </h2>
                {loading ? (
                  <div className="grid gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-slate-800 rounded w-full mb-2"></div>
                        <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                      </div>
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl">
                    <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No posts yet</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {posts.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trending posts */}
            {activeTab === 'trending' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                  Trending Now
                </h2>
                {trendingPosts.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl">
                    <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No trending posts</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {trendingPosts.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending sidebar */}
            {activeTab === 'all' && trendingPosts.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-50 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Trending
                </h3>
                <div className="space-y-4">
                  {trendingPosts.slice(0, 5).map((post, index) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <span className="text-2xl font-bold text-slate-700 group-hover:text-indigo-500 transition-colors">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-2">
                            {post.title[language]}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(post.like_count)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatNumber(post.view_count)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-50 mb-4">Categories</h3>
              <div className="space-y-2">
                {['Updates', 'Tutorials', 'News', 'Community', 'Events'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat.toLowerCase())}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-all ${
                      selectedCategory === cat.toLowerCase()
                        ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
