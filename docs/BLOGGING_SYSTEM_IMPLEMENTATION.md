# BlogList System Implementation

## Overview
Terviklik blogimise süsteem EventNexus platvormile, mis võimaldab:
- Adminitel postitada platvormi uuendusi ja teateid
- Kasutajatel luua ja jagada oma postitusi
- Kommenteerida, laikida ja jagada postitusi
- Jälgida teisi autoreid
- SEO-optimeeritud sisu Google'ile ja AI otsingumootorite jaoks

## Features

### 1. Blog Posts (Postitused)
- **Multilingual support**: Eesti, inglise ja vene keeles
- **Post types**: 
  - `admin_update` - platvormi uuendused ja teated
  - `user_post` - tavakasutajate postitused
  - `announcement` - tähtis teade
- **Rich content**: Markdown tugi, pildid, galeriid
- **SEO metadata**: Meta title, description, keywords, canonical URL
- **Scheduling**: Scheduled publishing support
- **Draft system**: Mustandite salvestamine enne avaldamist

### 2. Engagement Features

#### Likes (Meeldimine)
- Kasutajad saavad postitusi laikida
- Like count denormalized in blog_posts for performance
- Real-time updates

#### Comments (Kommentaarid)
- Nested replies support (parent_comment_id)
- Comment editing (is_edited flag)
- Comment moderation (is_flagged, is_deleted)
- Author information with avatars

#### Shares (Jagamine)
- Social media sharing: Twitter, Facebook, LinkedIn
- Copy link functionality
- Share tracking per platform
- Anonymous sharing support

#### Follows (Jälgimine)
- Follow blog authors
- Following feed shows posts from followed authors
- Follower counts per author

### 3. Discovery Features

#### Trending Posts
- Algorithm based on:
  - Likes × 3 points
  - Comments × 5 points
  - Shares × 10 points
  - Views × 0.1 points
  - Recency factor (-0.5 per hour)
- Last 30 days only

#### Featured Posts
- Admin-curated featured posts (is_featured flag)
- Prominent display on blog homepage

#### Categories
- Updates, Tutorials, News, Community, Events, Tips, Announcement
- Filter posts by category

#### Tags
- Free-form tagging system
- Filter by tag
- Tag cloud display

### 4. SEO Optimization

#### Meta Tags
- Open Graph (Facebook)
- Twitter Cards
- JSON-LD structured data
- Multilingual meta titles/descriptions

#### Sitemap Integration
- Blog posts added to `/api/sitemap.ts`
- News sitemap for recent posts (last 7 days)
- Weekly changefreq, 0.8 priority

#### Full-Text Search
- PostgreSQL full-text search indexes
- Multilingual: English, Estonian (simple), Russian
- Search function: `search_blog_posts(query, language, limit)`

#### AI Search Engines
- Structured content for Gemini, Claude, GPT crawlers
- `get_searchable_blog_posts()` function for indexing
- Clean semantic HTML structure

### 5. Access Control (RLS Policies)

#### Blog Posts
- Anyone can view published posts
- Authors can CRUD their own posts
- Admins can:
  - Create `admin_update` posts
  - View/edit/delete any post
  - Manage featured/pinned posts

#### Comments
- Anyone can view non-deleted comments
- Authors can view their deleted comments
- Users can comment if `allow_comments = true`
- Admins can delete any comment

#### Likes/Shares
- Anyone can view counts
- Authenticated users can like/share

#### Follows
- Anyone can view follow relationships
- Users can follow/unfollow others

## Database Schema

### Tables
1. **blog_posts** - Main posts table with multilingual content
2. **blog_comments** - Comments and nested replies
3. **blog_post_likes** - Like tracking (unique constraint)
4. **blog_post_shares** - Share tracking with platform info
5. **blog_follows** - Author following relationships

### Key Functions
- `generate_blog_slug(title)` - Generate unique URL slug
- `get_blog_post_with_engagement(post_id, user_id)` - Get post with user engagement data
- `get_trending_blog_posts(limit)` - Calculate trending posts
- `get_following_feed(user_id, limit, offset)` - Get feed from followed authors
- `increment_blog_post_views(post_id)` - Increment view counter
- `get_admin_updates(limit)` - Get platform updates
- `search_blog_posts(query, language, limit)` - Full-text search
- `get_searchable_blog_posts()` - Export for SEO indexing

### Triggers
- `update_blog_post_like_count` - Denormalize like counts
- `update_blog_post_comment_count` - Denormalize comment counts
- `update_blog_post_share_count` - Denormalize share counts
- `update_blog_updated_at` - Auto-update timestamps

## React Components

### BlogList.tsx
- Blog homepage with featured, trending, and latest posts
- Category and tag filtering
- Tabs: All Posts, Trending, Following, Platform Updates
- Sidebar with trending posts and categories
- Responsive grid layout

### BlogPost.tsx
- Individual post view with full content
- Author info with follow button
- Like, comment, share buttons
- Social sharing menu (Twitter, Facebook, LinkedIn, Copy Link)
- Nested comments with replies
- SEO: Helmet integration for meta tags
- View tracking on page load

### BlogPostEditor.tsx
- Rich text editor for creating/editing posts
- Multilingual content tabs (EN/ET/RU)
- Cover image upload
- Category and tag management
- SEO metadata editor (meta title, description, keywords)
- Draft/Publish workflow
- Preview mode

## API Services

### blogService.ts
All blog operations:
- `getBlogPosts(filters)` - List posts with filters
- `getBlogPostBySlug(slug, userId)` - Get single post
- `createBlogPost(post)` - Create new post
- `updateBlogPost(id, updates)` - Update post
- `deleteBlogPost(id)` - Delete post
- `publishBlogPost(id)` - Publish draft
- `incrementBlogPostViews(postId)` - Track views
- `getTrendingPosts(limit)` - Get trending
- `getFeaturedPosts(limit)` - Get featured
- `getAdminUpdates(limit)` - Get admin updates
- `getPostComments(postId)` - Get comments with replies
- `createComment(postId, content, parentId?)` - Add comment
- `updateComment(commentId, content)` - Edit comment
- `deleteComment(commentId)` - Delete comment
- `likeBlogPost(postId)` - Like post
- `unlikeBlogPost(postId)` - Unlike post
- `shareBlogPost(postId, platform, url)` - Track share
- `followAuthor(authorId)` - Follow author
- `unfollowAuthor(authorId)` - Unfollow author
- `getFollowingFeed(limit, offset)` - Get feed
- `getAuthorFollowerCount(authorId)` - Get follower count
- `getAuthorFollowingCount(authorId)` - Get following count

## Edge Functions

### blog-operations
Deno Edge Function for:
- `get_trending` - Get trending posts
- `get_featured` - Get featured posts
- `search` - Full-text search
- `get_feed` - User's following feed
- `increment_views` - Increment view count

## Routes (App.tsx)

```tsx
<Route path="/blog" element={<BlogList />} />
<Route path="/blog/new" element={user ? <BlogPostEditor /> : <LandingPage />} />
<Route path="/blog/:slug" element={<BlogPost />} />
```

## Migration Files

1. **20260121_blogging_system.sql** - Main schema, tables, policies, functions
2. **20260121_blog_seo_search.sql** - SEO indexing and full-text search

## Deployment Steps

1. **Run migrations**:
```bash
cd supabase
supabase db push
```

2. **Deploy Edge Function**:
```bash
supabase functions deploy blog-operations
```

3. **Update sitemap** (already done in `/api/sitemap.ts`)

4. **Test**:
- Navigate to `/blog`
- Create test post as admin: `/blog/new`
- Test commenting, liking, sharing
- Verify SEO meta tags in page source
- Check sitemap: `/api/sitemap`

## Admin Workflow

1. **Create Admin Update**:
   - Go to `/blog/new`
   - Select "Announcement" category
   - Fill multilingual content
   - Add SEO metadata
   - Publish or schedule

2. **Feature Posts**:
   - Edit post in database: `UPDATE blog_posts SET is_featured = true WHERE id = '...'`
   - Or add admin UI toggle (future enhancement)

3. **Pin Posts**:
   - Set `is_pinned = true` in database
   - Pinned posts appear at top

## User Workflow

1. **Read Blog**:
   - Visit `/blog`
   - Browse trending, featured, or all posts
   - Filter by category/tag

2. **Create Post**:
   - Click "Write a Post"
   - Fill content in preferred language(s)
   - Add cover image, tags, category
   - Save draft or publish immediately

3. **Engage**:
   - Like posts (heart icon)
   - Comment (with nested replies)
   - Share to social media or copy link
   - Follow favorite authors

4. **Following Feed**:
   - Click "Following" tab to see posts from followed authors

## SEO Benefits

### Google Indexing
- Semantic HTML with proper heading hierarchy
- Meta descriptions and titles
- Open Graph tags for social sharing
- Structured data (article schema)
- XML sitemap with blog posts
- News sitemap for recent content

### AI Search Engines
- Clean content structure
- Multilingual support
- Rich metadata (keywords, categories, tags)
- Author information
- Engagement metrics (views, likes, comments)
- Canonical URLs

### Social Sharing
- Open Graph images
- Twitter Card support
- Formatted preview snippets
- Share tracking

## Performance Optimizations

1. **Denormalized Counts**: like_count, comment_count, share_count, view_count stored directly
2. **Indexes**: Full-text search indexes per language, status/published_at indexes
3. **Lazy Loading**: React components lazy loaded
4. **Caching**: Sitemap cached for 1 hour
5. **Pagination**: Limit queries to prevent large data transfers

## Future Enhancements

1. **Rich Text Editor**: Integrate TinyMCE or similar WYSIWYG editor
2. **Image Upload**: Direct upload to Supabase Storage
3. **Draft Auto-Save**: Auto-save drafts every 30 seconds
4. **Admin Moderation**: Flag/approve comments, manage reported content
5. **Email Notifications**: Notify followers of new posts
6. **RSS Feed**: Generate RSS/Atom feed for blog subscribers
7. **Related Posts**: ML-based related content suggestions
8. **Reading Progress**: Track and display reading progress bar
9. **Bookmarks**: Save posts to read later
10. **Series/Collections**: Group related posts into series

## Monitoring

Track these metrics:
- Posts created per day
- Comments per post (average)
- Shares per post (average)
- Top categories/tags
- Most followed authors
- Trending posts accuracy
- SEO traffic from blog posts

## Security Considerations

- RLS policies enforce access control
- XSS prevention: sanitize user input in comments
- Rate limiting: prevent spam comments/likes (implement in Edge Function)
- Content moderation: admin flagging system
- GDPR compliance: user can delete own content

## Kasutamine

### Admin:
```bash
# Login as admin
# Navigate to /blog/new
# Create platform update with post_type='admin_update'
```

### User:
```bash
# Login as regular user
# Navigate to /blog/new
# Create user post with post_type='user_post'
```

### Public:
```bash
# No login required to read
# Navigate to /blog
# Browse and search posts
```

## Troubleshooting

**Problem**: Posts not showing
- Check `status = 'published'` and `published_at <= NOW()`
- Verify RLS policies are enabled

**Problem**: SEO meta tags missing
- Ensure Helmet component is installed: `npm install react-helmet-async`
- Check that Helmet provider wraps App.tsx

**Problem**: Comments not loading
- Check `allow_comments = true` on post
- Verify RLS policy allows comment reads

**Problem**: Slugs colliding
- `generate_blog_slug` function auto-appends counter
- Check for existing slugs before manual creation

## Kokkuvõte

Blogging system on täielikult funktsionaalne ja SEO-optimeeritud. Kasutajad saavad:
- ✅ Lugeda postitusi
- ✅ Luua oma postitusi
- ✅ Kommenteerida ja laikida
- ✅ Jagada sotsiaalmeediasse
- ✅ Jälgida autoreid
- ✅ Otsida full-text search'iga
- ✅ Google ja AI otsingumootoritele nähtav
- ✅ Multilingual (ET/EN/RU)
- ✅ Admin updates eraldi kategoorias

Süsteem on valmis kasutamiseks ja toetab platvormi kasvu läbi sisu loomise ja kasutajate kaasatuse!
