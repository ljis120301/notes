export interface DefaultTemplate {
  name: string
  description: string
  content: string
  category: string
  tags: string[]
}

export const defaultTemplates: DefaultTemplate[] = [
  {
    name: "Meeting Notes",
    description: "Structured template for meeting documentation",
    content: `
<h1>📅 Meeting Notes</h1>
<h3>Meeting Details</h3>
<ul>
  <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
  <li><strong>Time:</strong> </li>
  <li><strong>Attendees:</strong> </li>
  <li><strong>Location/Platform:</strong> </li>
</ul>

<h3>📋 Agenda</h3>
<ol>
  <li></li>
  <li></li>
  <li></li>
</ol>

<h3>💡 Key Discussion Points</h3>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h3>✅ Action Items</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>📝 Next Steps</h3>
<ul>
  <li><strong>Next meeting:</strong> </li>
  <li><strong>Follow-up required:</strong> </li>
</ul>
    `,
    category: "business",
    tags: ["meeting", "work", "agenda", "action-items"]
  },
  {
    name: "Daily Journal",
    description: "Simple daily reflection and planning template",
    content: `
<h1>📔 Daily Journal - ${new Date().toLocaleDateString()}</h1>

<h3>🌅 Morning Reflection</h3>
<p><strong>How am I feeling today?</strong></p>
<p></p>

<p><strong>What am I grateful for?</strong></p>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h3>🎯 Today's Goals</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>📖 Today's Events</h3>
<p></p>

<h3>🌙 Evening Reflection</h3>
<p><strong>What went well today?</strong></p>
<p></p>

<p><strong>What could I improve tomorrow?</strong></p>
<p></p>

<p><strong>Key learnings:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>
    `,
    category: "personal",
    tags: ["journal", "daily", "reflection", "goals"]
  },
  {
    name: "Project Plan",
    description: "Comprehensive project planning template",
    content: `
<h1>🚀 Project Plan</h1>

<h3>📋 Project Overview</h3>
<ul>
  <li><strong>Project Name:</strong> </li>
  <li><strong>Start Date:</strong> </li>
  <li><strong>Expected Completion:</strong> </li>
  <li><strong>Project Manager:</strong> </li>
  <li><strong>Stakeholders:</strong> </li>
</ul>

<h3>🎯 Objectives</h3>
<p><strong>Primary Goal:</strong></p>
<p></p>

<p><strong>Success Criteria:</strong></p>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h3>📈 Project Phases</h3>
<h4>Phase 1: Planning</h4>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h4>Phase 2: Development</h4>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h4>Phase 3: Testing & Deployment</h4>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>⚠️ Risks & Mitigation</h3>
<ul>
  <li><strong>Risk:</strong>  | <strong>Mitigation:</strong> </li>
  <li><strong>Risk:</strong>  | <strong>Mitigation:</strong> </li>
</ul>

<h3>📊 Resources Required</h3>
<ul>
  <li><strong>Team:</strong> </li>
  <li><strong>Budget:</strong> </li>
  <li><strong>Tools:</strong> </li>
</ul>
    `,
    category: "business",
    tags: ["project", "planning", "management", "goals"]
  },
  {
    name: "Book Review",
    description: "Template for documenting book insights and reviews",
    content: `
<h1>📚 Book Review</h1>

<h3>📖 Book Information</h3>
<ul>
  <li><strong>Title:</strong> </li>
  <li><strong>Author:</strong> </li>
  <li><strong>Genre:</strong> </li>
  <li><strong>Pages:</strong> </li>
  <li><strong>Date Read:</strong> ${new Date().toLocaleDateString()}</li>
  <li><strong>Rating:</strong> ⭐⭐⭐⭐⭐ (out of 5)</li>
</ul>

<h3>📝 Summary</h3>
<p></p>

<h3>💡 Key Takeaways</h3>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h3>📌 Favorite Quotes</h3>
<blockquote>
  <p>"Quote here"</p>
</blockquote>
<blockquote>
  <p>"Another meaningful quote"</p>
</blockquote>

<h3>🤔 Personal Thoughts</h3>
<p><strong>What I liked:</strong></p>
<p></p>

<p><strong>What could be better:</strong></p>
<p></p>

<p><strong>Would I recommend it?</strong></p>
<p></p>

<h3>🔗 Related Books/Topics</h3>
<ul>
  <li></li>
  <li></li>
</ul>
    `,
    category: "personal",
    tags: ["book", "review", "reading", "notes"]
  },
  {
    name: "Recipe Card",
    description: "Template for documenting recipes",
    content: `
<h1>👨‍🍳 Recipe: [Recipe Name]</h1>

<h3>ℹ️ Recipe Info</h3>
<ul>
  <li><strong>Prep Time:</strong> </li>
  <li><strong>Cook Time:</strong> </li>
  <li><strong>Total Time:</strong> </li>
  <li><strong>Serves:</strong> </li>
  <li><strong>Difficulty:</strong> </li>
</ul>

<h3>🛒 Ingredients</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>👩‍🍳 Instructions</h3>
<ol>
  <li></li>
  <li></li>
  <li></li>
  <li></li>
</ol>

<h3>💡 Tips & Notes</h3>
<ul>
  <li></li>
  <li></li>
</ul>

<h3>📝 Variations</h3>
<p></p>

<h3>⭐ Rating & Review</h3>
<p><strong>Rating:</strong> ⭐⭐⭐⭐⭐</p>
<p><strong>Notes:</strong></p>
<p></p>
    `,
    category: "personal",
    tags: ["recipe", "cooking", "food", "kitchen"]
  },
  {
    name: "Weekly Review",
    description: "Template for weekly planning and reflection",
    content: `
<h1>📅 Weekly Review - Week of ${new Date().toLocaleDateString()}</h1>

<h3>🎯 This Week's Goals</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>✅ Accomplishments</h3>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h3>📈 Areas of Growth</h3>
<p><strong>What went well:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>

<p><strong>Challenges faced:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>

<h3>🔄 Lessons Learned</h3>
<ul>
  <li></li>
  <li></li>
</ul>

<h3>➡️ Next Week's Focus</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<h3>💡 Ideas & Inspirations</h3>
<ul>
  <li></li>
  <li></li>
</ul>
    `,
    category: "personal",
    tags: ["weekly", "review", "planning", "reflection"]
  }
]

export const defaultCategories = [
  {
    name: "Business",
    description: "Professional templates for work and business",
    icon: "briefcase",
    color: "#3b82f6"
  },
  {
    name: "Personal",
    description: "Personal templates for daily life and hobbies",
    icon: "user",
    color: "#10b981"
  },
  {
    name: "Education",
    description: "Templates for learning and academic purposes",
    icon: "graduation-cap",
    color: "#8b5cf6"
  },
  {
    name: "Health",
    description: "Templates for health and wellness tracking",
    icon: "heart",
    color: "#ef4444"
  }
] 