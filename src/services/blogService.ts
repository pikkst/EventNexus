import { supabase } from './supabase';

export interface BlogPost {
  id: string;
  author_id: string;
  post_type: 'admin_update' | 'user_post' | 'announcement';
  title: {
    en: string;
    et: string;
    ru: string;
  };
  slug: string;
  content: {
    en: string;
    et: string;
    ru: string;
  };
  excerpt?: {
    en: string;
    et: string;
    ru: string;
  };
  meta_title?: {
    en: string;
    et: string;
    ru: string;
  };
  meta_description?: {
    en: string;
    et: string;
    ru: string;
  };
  meta_keywords?: string[];
  canonical_url?: string;
  cover_image_url?: string;
  featured_image_url?: string;
  gallery_images?: string[];
  category?: string;
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  scheduled_publish_at?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  avg_read_time_seconds?: number;
  allow_comments: boolean;
  is_pinned: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface BlogComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  content: string;
  like_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replies?: BlogComment[];
}

export interface BlogFollow {
  id: string;
  follower_id: string;
  following_user_id: string;
  created_at: string;
}

// Blog Posts
export async function getBlogPosts(filters?: {
  category?: string;
  tag?: string;
  author_id?: string;
  post_type?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('blog_posts')
    .select('*, author:users(id, name, avatar)')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag]);
  }
  if (filters?.author_id) {
    query = query.eq('author_id', filters.author_id);
  }
  if (filters?.post_type) {
    query = query.eq('post_type', filters.post_type);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBlogPostBySlug(slug: string, userId?: string) {
  // First, get the post ID from the slug
  const { data: slugData, error: slugError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single();

  if (slugError || !slugData?.id) {
    throw new Error(`Blog post not found for slug: ${slug}`);
  }

  // Now fetch the post with engagement data
  const { data, error } = await supabase
    .rpc('get_blog_post_with_engagement', {
      p_post_id: slugData.id,
      p_user_id: userId || null
    });

  if (error) throw error;
  return data?.[0];
}

export async function createBlogPost(post: Partial<BlogPost>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate slug from title
  const titleEn = post.title?.en || '';
  const { data: slugData } = await supabase.rpc('generate_blog_slug', { p_title: titleEn });

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...post,
      author_id: user.id,
      slug: slugData || titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishBlogPost(id: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementBlogPostViews(postId: string) {
  await supabase.rpc('increment_blog_post_views', { p_post_id: postId });
}

// Trending & Featured
export async function getTrendingPosts(limit = 10) {
  const { data, error } = await supabase
    .rpc('get_trending_blog_posts', { p_limit: limit });

  if (error) throw error;
  return data;
}

export async function getFeaturedPosts(limit = 5) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, author:users(id, name, avatar)')
    .eq('status', 'published')
    .eq('is_featured', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getAdminUpdates(limit = 10) {
  const { data, error } = await supabase
    .rpc('get_admin_updates', { p_limit: limit });

  if (error) throw error;
  return data;
}

// Comments
export async function getPostComments(postId: string) {
  const { data, error } = await supabase
    .from('blog_comments')
    .select('*, author:users(id, name, avatar)')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    (data || []).map(async (comment) => {
      const { data: replies } = await supabase
        .from('blog_comments')
        .select('*, author:users(id, name, avatar)')
        .eq('parent_comment_id', comment.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      return { ...comment, replies: replies || [] };
    })
  );

  return commentsWithReplies;
}

export async function createComment(postId: string, content: string, parentCommentId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('blog_comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      parent_comment_id: parentCommentId,
      content
    })
    .select('*, author:users(id, name, avatar)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateComment(commentId: string, content: string) {
  const { data, error } = await supabase
    .from('blog_comments')
    .update({ content, is_edited: true })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('blog_comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) throw error;
}

// Likes
export async function likeBlogPost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blog_post_likes')
    .insert({ post_id: postId, user_id: user.id });

  if (error) throw error;
}

export async function unlikeBlogPost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blog_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function isPostLiked(postId: string, userId: string) {
  const { data } = await supabase
    .from('blog_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

// Shares
export async function shareBlogPost(postId: string, platform: string, shareUrl: string) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('blog_post_shares')
    .insert({
      post_id: postId,
      user_id: user?.id,
      share_platform: platform,
      share_url: shareUrl
    });

  if (error) throw error;
}

// Follows
export async function followAuthor(authorId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blog_follows')
    .insert({ follower_id: user.id, following_user_id: authorId });

  if (error) throw error;
}

export async function unfollowAuthor(authorId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blog_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_user_id', authorId);

  if (error) throw error;
}

export async function isFollowingAuthor(authorId: string, userId: string) {
  const { data } = await supabase
    .from('blog_follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_user_id', authorId)
    .single();

  return !!data;
}

export async function getFollowingFeed(limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('get_following_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset
    });

  if (error) throw error;
  return data;
}

export async function getAuthorFollowerCount(authorId: string) {
  const { count, error } = await supabase
    .from('blog_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_user_id', authorId);

  if (error) throw error;
  return count || 0;
}

export async function getAuthorFollowingCount(authorId: string) {
  const { count, error } = await supabase
    .from('blog_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', authorId);

  if (error) throw error;
  return count || 0;
}
