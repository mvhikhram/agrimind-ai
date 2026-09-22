import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Plus, 
  Send, 
  Image as ImageIcon,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';
import { CommunityPost } from '../types';
import { dataService } from '../services/dataService';

const CATEGORIES = ['All', 'Crop', 'Irrigation', 'Disease', 'Equipment', 'Technology', 'General'] as const;

export const Community: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [posts, setPosts] = useState<CommunityPost[]>(() => dataService.getCommunityPosts());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Post State
  const [authorName, setAuthorName] = useState('Anand Patil (Progressive Grower)');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CommunityPost['category']>('Irrigation');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Comment input per post
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const refreshPosts = () => {
    setPosts([...dataService.getCommunityPosts()]);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    dataService.addCommunityPost({
      author_name: authorName,
      category,
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl.trim() || undefined
    });

    setTitle('');
    setContent('');
    setImageUrl('');
    setIsCreateModalOpen(false);
    refreshPosts();
  };

  const handleToggleLike = (postId: string) => {
    dataService.toggleLikePost(postId);
    refreshPosts();
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    dataService.addComment(postId, 'You (Farmer)', commentText.trim());
    setCommentText('');
    setActiveCommentPostId(null);
    refreshPosts();
  };

  const filteredPosts = selectedCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-farm-400" />
              <span>Demo Community Forum</span>
            </h2>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span>🟡</span>
              <span>DEMO COMMUNITY</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulated peer-to-peer knowledge exchange for drip management, disease containment, and hardware troubleshooting.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-bold text-sm shadow-glow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Discussion</span>
        </button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-farm-500 text-obsidian-950 shadow-glow-sm'
                : 'bg-obsidian-850 text-slate-400 hover:text-white border border-farm-500/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts Stream */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 transition-all hover:border-farm-500/40"
          >
            {/* Author & Category Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white">{post.author_name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-farm-500/15 text-farm-300 border border-farm-500/20">
                    {post.category}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    DEMO
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{post.created_at}</span>
                </div>
              </div>
            </div>

            {/* Post Title & Content */}
            <h3 className="font-display font-bold text-base text-white mb-2">{post.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-4">
              {post.content}
            </p>

            {post.image_url && (
              <div className="rounded-2xl overflow-hidden mb-4 border border-slate-700 max-h-72">
                <img src={post.image_url} alt="Attached crop" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Interactions Bar */}
            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1.5 font-bold transition-all ${
                    post.liked_by_user ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.liked_by_user ? 'fill-rose-400' : ''}`} />
                  <span>{post.likes_count} Likes</span>
                </button>

                <button
                  onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 font-bold text-slate-400 hover:text-white"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.comments.length} Comments</span>
                </button>
              </div>
            </div>

            {/* Comments List */}
            {post.comments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                {post.comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 text-xs">
                    <div className="flex justify-between items-baseline mb-1">
                      <strong className="text-farm-300">{c.author_name}</strong>
                      <span className="text-[10px] text-slate-500">{c.created_at}</span>
                    </div>
                    <p className="text-slate-300">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Input */}
            {activeCommentPostId === post.id && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a reply to this farmer..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-obsidian-900 border border-farm-500/20 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={() => handleAddComment(post.id)}
                  className="px-4 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-bold text-xs hover:bg-farm-400"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-obsidian-900 border border-farm-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-farm-500/15">
              <h3 className="font-display font-bold text-lg text-white">Create Community Discussion</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-3 py-2 text-white"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Discussion Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drip manifold pressure drops in Zone 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Post Description & Agronomic Details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe soil type, pump flow, symptoms observed, or hardware question..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-black hover:bg-farm-400 shadow-glow-sm"
                >
                  Post to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
