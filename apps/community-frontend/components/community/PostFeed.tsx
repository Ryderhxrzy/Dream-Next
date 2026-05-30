'use client';

import PostCard from "./PostCard";

const DUMMY_POSTS = [
  {
    id: "1",
    type: "normal" as const,
    author: { name: "City of Maplewood", initials: "CM", isOfficial: true },
    timeAgo: "2 hours ago",
    location: "Maplewood Heights",
    content: "The park renovation at Elm St & 4th Ave is officially complete! New playground equipment, a refurbished basketball court, and beautiful landscaping. Come to the ribbon cutting this Saturday at 10am — all neighbors welcome!",
    imageUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&auto=format&fit=crop",
    helpfulCount: 142,
    commentCount: 34,
  },
  {
    id: "2",
    type: "question" as const,
    author: { name: "Mark T.", initials: "MT" },
    timeAgo: "3 hours ago",
    location: "Pinecrest Block",
    content: "Does anyone have a recommendation for a reliable plumber in the area? Had a pipe burst last night and my usual guy is completely booked out for 3 weeks. Any help appreciated — it's kind of urgent!",
    helpfulCount: 8,
    commentCount: 23,
  },
  {
    id: "3",
    type: "event" as const,
    author: { name: "Sarah K.", initials: "SK" },
    timeAgo: "Yesterday",
    location: "Maple Street",
    content: "You're invited to the Annual Summer Block Party! 🎉 Join us Saturday, June 14th from 3–9 PM on Maple Street. Bring a dish to share, kids are very welcome, and live music starts at 5 PM!",
    helpfulCount: 0,
    commentCount: 12,
    event: {
      month: "JUN",
      day: "14",
      title: "Summer Block Party",
      date: "Sat, Jun 14 · 3:00 PM",
      location: "Maple St, 2nd–4th Ave",
      going: true,
      goingCount: 89,
      interestedCount: 24,
    },
  },
]

const PostFeed = () => {
  return (
    <div className="space-y-3">
      {DUMMY_POSTS.map((post) => (
        <PostCard key={post.id} post={post}/>
      ))}
    </div>
  )
}

export default PostFeed
