import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  Calendar,
  Eye,
  User,
  UserPlus,
  UserMinus,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  ArrowLeft,
  Tag,
  Clock
} from 'lucide-react';
import { 
  getBlogPostBySlug, 
  incrementBlogPostViews,
  likeBlogPost,
  unlikeBlogPost,
  shareBlogPost,
  followAuthor,
  unfollowAuthor,
  getPostComments,
  createComment
} from '../services/blogService';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../services/supabase';

interface BlogPost {
  id: string;
  title: { en: string; et: string; ru: string };
  slug: string;
  content: { en: string; et: string; ru: string };
  excerpt?: { en: string; et: string; ru: string };
  cover_image_url?: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  category?: string;
  tags?: string[];
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  avg_read_time_seconds?: number;
  meta_title?: { en: string; et: string; ru: string };
  meta_description?: { en: string; et: string; ru: string };
  meta_keywords?: string[];
  is_liked?: boolean;
  is_following_author?: boolean;
  follower_count?: number;
  author_post_count?: number;
}

interface Comment {
  id: string;
  author: {
    full_name: string;
    avatar_url?: string;
  };
  content: string;
  created_at: string;
  like_count: number;
  replies?: Comment[];
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const language = 'en'; // Get from context/props

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (slug) {
      loadPost();
      loadComments();
    }
  }, [slug, userId]);

  async function loadPost() {
    try {
      setLoading(true);
      const data = await getBlogPostBySlug(slug!, userId);
      
      if (data?.post) {
        setPost(data.post);
        setIsLiked(data.is_liked);
        setIsFollowing(data.is_following_author);
        await incrementBlogPostViews(data.post.id);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    try {
      const data = await getPostComments(post?.id!);
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleLike() {
    if (!post) return;
    
    try {
      if (isLiked) {
        await unlikeBlogPost(post.id);
        setPost({ ...post, like_count: post.like_count - 1 });
      } else {
        await likeBlogPost(post.id);
        setPost({ ...post, like_count: post.like_count + 1 });
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  async function handleFollow() {
    if (!post) return;
    
    try {
      if (isFollowing) {
        await unfollowAuthor(post.author.id);
      } else {
        await followAuthor(post.author.id);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }

  async function handleShare(platform: string) {
    if (!post) return;
    
    const url = `${window.location.origin}/blog/${post.slug}`;
    const title = post.title[language];
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    await shareBlogPost(post.id, platform, shareUrl);
    setPost({ ...post, share_count: post.share_count + 1 });
    setShowShareMenu(false);
  }

  async function handleComment() {
    if (!post || !commentText.trim()) return;
    
    try {
      await createComment(post.id, commentText, replyingTo || undefined);
      setCommentText('');
      setReplyingTo(null);
      await loadComments();
      setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('et-EE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatReadTime = (seconds?: number) => {
    if (!seconds) return '5 min read';
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min read`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">Post not found</h2>
          <button
            onClick={() => navigate('/blog')}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Back to blog
          </button>
        </div>
      </div>
    );
  }

  const metaTitle = post.meta_title?.[language] || post.title[language];
  const metaDescription = post.meta_description?.[language] || post.excerpt?.[language] || '';

  return (
    <>
      <Helmet>
        <title>{metaTitle} | EventNexus Blog</title>
        <meta name="description" content={metaDescription} />
        {post.meta_keywords && (
          <meta name="keywords" content={post.meta_keywords.join(', ')} />
        )}
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        {post.cover_image_url && (
          <meta property="og:image" content={post.cover_image_url} />
        )}
        <meta property="og:url" content={`${window.location.origin}/blog/${post.slug}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {post.cover_image_url && (
          <meta name="twitter:image" content={post.cover_image_url} />
        )}
        
        {/* Article metadata */}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:author" content={post.author.full_name} />
        {post.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate('/blog')}
              className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to blog
            </button>

            {/* Author info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.full_name}
                    className="w-12 h-12 rounded-full border-2 border-indigo-500/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-400" />
                  </div>
                )}
                <div>
                  <Link
                    to={`/profile/${post.author.id}`}
                    className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors"
                  >
                    {post.author.full_name}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{formatDate(post.published_at)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatReadTime(post.avg_read_time_seconds)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-600/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-black text-slate-50 mb-4 tracking-tight">
              {post.title[language]}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.view_count} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {post.like_count} likes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {post.comment_count} comments
              </span>
            </div>
          </div>
        </div>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <img
              src={post.cover_image_url}
              alt={post.title[language]}
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <article className="prose prose-lg prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-indigo-400 prose-strong:text-slate-200 prose-code:text-indigo-400 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
            <div dangerouslySetInnerHTML={{ __html: post.content[language] }} />
          </article>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-slate-800">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm border border-slate-700 hover:border-indigo-500/30 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Engagement actions */}
          <div className="flex items-center gap-4 mt-8 pt-8 border-t border-slate-800">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                isLiked
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              {post.like_count}
            </button>

            <button
              onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700"
            >
              <MessageCircle className="w-5 h-5" />
              {post.comment_count}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>

              {showShareMenu && (
                <div className="absolute top-full mt-2 left-0 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-2 z-10 min-w-[200px]">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-800 rounded-lg text-left text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    <Twitter className="w-4 h-4 text-blue-400" />
                    Twitter
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-800 rounded-lg text-left text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-800 rounded-lg text-left text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    <Linkedin className="w-4 h-4 text-blue-700" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('copy')}
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-800 rounded-lg text-left text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    Copy link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Comments section */}
          <div id="comments" className="mt-12 pt-8 border-t border-slate-800">
            <h2 className="text-2xl font-bold text-slate-50 mb-6">
              Comments ({post.comment_count})
            </h2>

            {/* Comment form */}
            <div className="mb-8">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200 placeholder-slate-500"
                rows={4}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  Post Comment
                </button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    {comment.author.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt={comment.author.full_name}
                        className="w-10 h-10 rounded-full border-2 border-indigo-500/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-200">
                          {comment.author.full_name}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <button className="text-sm text-slate-500 hover:text-indigo-400 transition-colors">
                          <Heart className="w-4 h-4 inline mr-1" />
                          {comment.like_count}
                        </button>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-sm text-slate-500 hover:text-indigo-400 transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-4 pl-6 border-l-2 border-slate-700">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              {reply.author.avatar_url ? (
                                <img
                                  src={reply.author.avatar_url}
                                  alt={reply.author.full_name}
                                  className="w-8 h-8 rounded-full border border-indigo-500/30"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                                  <User className="w-4 h-4 text-indigo-400" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-slate-200 text-sm">
                                    {reply.author.full_name}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatDate(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-slate-300 text-sm">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
