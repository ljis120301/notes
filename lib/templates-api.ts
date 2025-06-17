import { pb, Template, TemplateCategory, templatesCollection, templateCategoriesCollection } from './pocketbase'

// Helper function to ensure user is authenticated
function ensureAuth() {
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    throw new Error('User not authenticated')
  }
  return pb.authStore.model.id
}

// Helper function to check if error is auto-cancellation
function isAutoCancelled(error: unknown): boolean {
  const err = error as { isAbort?: boolean; message?: string; status?: number }
  return err?.isAbort === true || 
         err?.message?.includes('autocancelled') || 
         err?.status === 0
}

// ============ TEMPLATE OPERATIONS ============

export async function createTemplate(data: Omit<Template, 'id' | 'created' | 'updated' | 'user' | 'usage_count'>): Promise<Template> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(templatesCollection).create({
      ...data,
      users: userId,
      usage_count: 0
    })
    return record as unknown as Template
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create template request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('Failed to create template:', error)
    throw error
  }
}

export async function getTemplates(options?: {
  category?: string
  isPublic?: boolean
  search?: string
  limit?: number
}): Promise<Template[]> {
  const userId = ensureAuth()
  
  try {
    console.log('Fetching templates for user:', userId, 'with options:', options)
    let filter = `users="${userId}"`
    
    // Add public templates if requested
    if (options?.isPublic) {
      filter = `(${filter}) || is_public=true`
    }
    
    // Add category filter
    if (options?.category) {
      filter = `(${filter}) && category="${options.category}"`
    }
    
    // Add search filter
    if (options?.search) {
      const searchTerm = options.search.replace(/"/g, '\\"')
      filter = `(${filter}) && (name~"${searchTerm}" || description~"${searchTerm}")`
    }
    
    console.log('Using filter:', filter)
    
    const records = await pb.collection(templatesCollection).getFullList({
      sort: '-updated',
      filter,
      limit: options?.limit || 100
    })
    
    console.log(`Found ${records.length} templates`)
    return records as unknown as Template[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get templates request was auto-cancelled')
      return []
    }
    console.error('Failed to fetch templates:', error)
    
    // Better error reporting
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('404')) {
      console.error('Templates collection not found in PocketBase. Please create it first.')
    } else if (errorMessage.includes('403') || errorMessage.includes('401')) {
      console.error('Permission denied accessing templates. Check your API rules and field names.')
    }
    
    throw error
  }
}

export async function getTemplate(id: string): Promise<Template> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(templatesCollection).getOne(id)
    
    // Check if user has access (owner or public template)
    if (record.users !== userId && !record.is_public) {
      throw new Error('Template not found or access denied')
    }
    
    return record as unknown as Template
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get template request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    const err = error as { status?: number }
    if (err.status === 404) {
      throw new Error('Template not found')
    }
    throw error
  }
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const userId = ensureAuth()
  
  try {
    // First verify the user owns this template
    const existing = await pb.collection(templatesCollection).getOne(id)
    if (existing.users !== userId) {
      throw new Error('Not authorized to update this template')
    }
    
    const record = await pb.collection(templatesCollection).update(id, data)
    return record as unknown as Template
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Update template request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('Failed to update template:', error)
    throw error
  }
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const userId = ensureAuth()
  
  try {
    // First verify the user owns this template
    const existing = await pb.collection(templatesCollection).getOne(id)
    if (existing.users !== userId) {
      throw new Error('Not authorized to delete this template')
    }
    
    await pb.collection(templatesCollection).delete(id)
    return true
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Delete template request was auto-cancelled')
      return false
    }
    console.error('Failed to delete template:', error)
    throw error
  }
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  try {
    const template = await pb.collection(templatesCollection).getOne(id)
    const currentUsage = template.usage_count || 0
    
    await pb.collection(templatesCollection).update(id, {
      usage_count: currentUsage + 1
    })
  } catch (error: unknown) {
    // Don't throw errors for usage tracking - it's not critical
    console.warn('Failed to increment template usage:', error)
  }
}

// ============ TEMPLATE CATEGORY OPERATIONS ============

export async function createTemplateCategory(data: Omit<TemplateCategory, 'id' | 'created' | 'updated' | 'user'>): Promise<TemplateCategory> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(templateCategoriesCollection).create({
      ...data,
      users: userId
    })
    return record as unknown as TemplateCategory
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create template category request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('Failed to create template category:', error)
    throw error
  }
}

export async function getTemplateCategories(): Promise<TemplateCategory[]> {
  const userId = ensureAuth()
  
  try {
    const records = await pb.collection(templateCategoriesCollection).getFullList({
      sort: 'name',
      filter: `users="${userId}"`
    })
    
    return records as unknown as TemplateCategory[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get template categories request was auto-cancelled')
      return []
    }
    console.error('Failed to fetch template categories:', error)
    throw error
  }
}

export async function updateTemplateCategory(id: string, data: Partial<TemplateCategory>): Promise<TemplateCategory> {
  const userId = ensureAuth()
  
  try {
    // First verify the user owns this category
    const existing = await pb.collection(templateCategoriesCollection).getOne(id)
    if (existing.users !== userId) {
      throw new Error('Not authorized to update this category')
    }
    
    const record = await pb.collection(templateCategoriesCollection).update(id, data)
    return record as unknown as TemplateCategory
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Update template category request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('Failed to update template category:', error)
    throw error
  }
}

export async function deleteTemplateCategory(id: string): Promise<boolean> {
  const userId = ensureAuth()
  
  try {
    // First verify the user owns this category
    const existing = await pb.collection(templateCategoriesCollection).getOne(id)
    if (existing.users !== userId) {
      throw new Error('Not authorized to delete this category')
    }
    
    await pb.collection(templateCategoriesCollection).delete(id)
    return true
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Delete template category request was auto-cancelled')
      return false
    }
    console.error('Failed to delete template category:', error)
    throw error
  }
}

// ============ PREDEFINED TEMPLATES ============

export const DEFAULT_TEMPLATES: Omit<Template, 'id' | 'created' | 'updated' | 'user' | 'usage_count'>[] = [
  {
    name: 'Meeting Notes',
    description: 'Template for organizing meeting notes with agenda, attendees, and action items',
    category: 'meeting',
    content: `<h1>Meeting Notes</h1>
<h2>📅 Meeting Details</h2>
<p><strong>Date:</strong> [Insert Date]</p>
<p><strong>Time:</strong> [Insert Time]</p>
<p><strong>Location:</strong> [Insert Location/Link]</p>

<h2>👥 Attendees</h2>
<ul>
  <li>[Name 1]</li>
  <li>[Name 2]</li>
  <li>[Name 3]</li>
</ul>

<h2>📋 Agenda</h2>
<ol>
  <li>[Agenda Item 1]</li>
  <li>[Agenda Item 2]</li>
  <li>[Agenda Item 3]</li>
</ol>

<h2>💬 Discussion Points</h2>
<h3>[Topic 1]</h3>
<p>[Discussion notes...]</p>

<h3>[Topic 2]</h3>
<p>[Discussion notes...]</p>

<h2>✅ Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>[Action item 1] - [Assigned to] - [Due date]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Action item 2] - [Assigned to] - [Due date]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Action item 3] - [Assigned to] - [Due date]</p></li>
</ul>

<h2>📝 Next Steps</h2>
<p>[Summary of next steps...]</p>`,
    tags: ['meeting', 'business', 'collaboration'],
    is_public: true
  },
  {
    name: 'Project Plan',
    description: 'Comprehensive project planning template with timeline, milestones, and resources',
    category: 'project',
    content: `<h1>Project Plan: [Project Name]</h1>

<h2>📖 Project Overview</h2>
<p><strong>Project Description:</strong> [Brief description of the project]</p>
<p><strong>Project Manager:</strong> [Name]</p>
<p><strong>Start Date:</strong> [Date]</p>
<p><strong>End Date:</strong> [Date]</p>
<p><strong>Budget:</strong> [Amount]</p>

<h2>🎯 Objectives</h2>
<ol>
  <li>[Primary objective]</li>
  <li>[Secondary objective]</li>
  <li>[Additional objective]</li>
</ol>

<h2>📊 Key Milestones</h2>
<table>
  <tr>
    <th>Milestone</th>
    <th>Date</th>
    <th>Status</th>
  </tr>
  <tr>
    <td>[Milestone 1]</td>
    <td>[Date]</td>
    <td>🟡 In Progress</td>
  </tr>
  <tr>
    <td>[Milestone 2]</td>
    <td>[Date]</td>
    <td>⚪ Not Started</td>
  </tr>
  <tr>
    <td>[Milestone 3]</td>
    <td>[Date]</td>
    <td>⚪ Not Started</td>
  </tr>
</table>

<h2>📋 Task List</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>Phase 1:</strong> [Task description]</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>Phase 2:</strong> [Task description]</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>Phase 3:</strong> [Task description]</p></li>
</ul>

<h2>👥 Team & Resources</h2>
<ul>
  <li><strong>[Role 1]:</strong> [Name] - [Responsibilities]</li>
  <li><strong>[Role 2]:</strong> [Name] - [Responsibilities]</li>
  <li><strong>[Role 3]:</strong> [Name] - [Responsibilities]</li>
</ul>

<h2>⚠️ Risks & Mitigation</h2>
<table>
  <tr>
    <th>Risk</th>
    <th>Probability</th>
    <th>Impact</th>
    <th>Mitigation Strategy</th>
  </tr>
  <tr>
    <td>[Risk 1]</td>
    <td>Low/Medium/High</td>
    <td>Low/Medium/High</td>
    <td>[Strategy]</td>
  </tr>
</table>

<h2>📈 Success Criteria</h2>
<ul>
  <li>[Criteria 1]</li>
  <li>[Criteria 2]</li>
  <li>[Criteria 3]</li>
</ul>`,
    tags: ['project', 'planning', 'management'],
    is_public: true
  },
  {
    name: 'Daily Journal',
    description: 'Personal daily journal template for reflection and planning',
    category: 'personal',
    content: `<h1>Daily Journal - [Date]</h1>

<h2>🌅 Morning Reflection</h2>
<h3>How am I feeling today?</h3>
<p>[Write your thoughts...]</p>

<h3>What am I grateful for?</h3>
<ul>
  <li>[Gratitude item 1]</li>
  <li>[Gratitude item 2]</li>
  <li>[Gratitude item 3]</li>
</ul>

<h3>Today's Priorities</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>[Priority task 1]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Priority task 2]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Priority task 3]</p></li>
</ul>

<h2>🌞 Daily Activities</h2>
<h3>Work/Professional</h3>
<p>[What did you accomplish at work today?]</p>

<h3>Personal</h3>
<p>[What did you do for yourself today?]</p>

<h3>Relationships</h3>
<p>[How did you connect with others today?]</p>

<h2>🌙 Evening Reflection</h2>
<h3>Today's Wins</h3>
<ul>
  <li>[Win 1]</li>
  <li>[Win 2]</li>
  <li>[Win 3]</li>
</ul>

<h3>Challenges & Lessons</h3>
<p>[What challenges did you face and what did you learn?]</p>

<h3>Tomorrow's Intention</h3>
<p>[What do you want to focus on tomorrow?]</p>

<h2>💭 Free Thoughts</h2>
<p>[Any other thoughts, ideas, or feelings to capture...]</p>`,
    tags: ['personal', 'reflection', 'daily'],
    is_public: true
  },
  {
    name: 'Weekly Review',
    description: 'Weekly review template for tracking progress and planning ahead',
    category: 'personal',
    content: `<h1>Weekly Review - Week of [Date]</h1>

<h2>📊 Week Overview</h2>
<p><strong>Theme of the week:</strong> [What defined this week?]</p>
<p><strong>Energy level:</strong> [Low/Medium/High]</p>
<p><strong>Overall satisfaction:</strong> [1-10]</p>

<h2>✅ Accomplishments</h2>
<h3>Professional</h3>
<ul>
  <li>[Achievement 1]</li>
  <li>[Achievement 2]</li>
  <li>[Achievement 3]</li>
</ul>

<h3>Personal</h3>
<ul>
  <li>[Achievement 1]</li>
  <li>[Achievement 2]</li>
  <li>[Achievement 3]</li>
</ul>

<h2>🎯 Goal Progress</h2>
<table>
  <tr>
    <th>Goal</th>
    <th>Target</th>
    <th>Actual</th>
    <th>Progress</th>
  </tr>
  <tr>
    <td>[Goal 1]</td>
    <td>[Target]</td>
    <td>[Actual]</td>
    <td>[%]</td>
  </tr>
  <tr>
    <td>[Goal 2]</td>
    <td>[Target]</td>
    <td>[Actual]</td>
    <td>[%]</td>
  </tr>
</table>

<h2>📚 Learning & Growth</h2>
<ul>
  <li><strong>New skill/knowledge:</strong> [What did you learn?]</li>
  <li><strong>Book/Article read:</strong> [Title and key takeaways]</li>
  <li><strong>Feedback received:</strong> [Important feedback and how to apply it]</li>
</ul>

<h2>🚧 Challenges & Obstacles</h2>
<ul>
  <li><strong>Challenge:</strong> [Description]
    <ul>
      <li><strong>How I handled it:</strong> [Your response]</li>
      <li><strong>What I learned:</strong> [Lesson]</li>
    </ul>
  </li>
</ul>

<h2>🔮 Next Week Planning</h2>
<h3>Top 3 Priorities</h3>
<ol>
  <li>[Priority 1]</li>
  <li>[Priority 2]</li>
  <li>[Priority 3]</li>
</ol>

<h3>Areas to Improve</h3>
<ul>
  <li>[Improvement area 1]</li>
  <li>[Improvement area 2]</li>
</ul>

<h3>Experiments to Try</h3>
<ul>
  <li>[New approach or habit to test]</li>
  <li>[Different way of doing something]</li>
</ul>

<h2>💭 Reflections</h2>
<p>[Any additional thoughts, insights, or observations about the week...]</p>`,
    tags: ['personal', 'weekly', 'review', 'planning'],
    is_public: true
  },
  {
    name: 'Book Notes',
    description: 'Template for capturing key insights and notes while reading',
    category: 'learning',
    content: `<h1>📚 Book Notes: [Book Title]</h1>

<h2>📖 Book Information</h2>
<p><strong>Title:</strong> [Book Title]</p>
<p><strong>Author:</strong> [Author Name]</p>
<p><strong>Genre:</strong> [Genre]</p>
<p><strong>Pages:</strong> [Number of pages]</p>
<p><strong>Started:</strong> [Date]</p>
<p><strong>Finished:</strong> [Date]</p>
<p><strong>Rating:</strong> ⭐⭐⭐⭐⭐ ([X]/5)</p>

<h2>💡 Key Themes</h2>
<ul>
  <li>[Theme 1]</li>
  <li>[Theme 2]</li>
  <li>[Theme 3]</li>
</ul>

<h2>✨ Favorite Quotes</h2>
<blockquote>
  <p>"[Quote 1]"</p>
  <footer>- Page [X]</footer>
</blockquote>

<blockquote>
  <p>"[Quote 2]"</p>
  <footer>- Page [X]</footer>
</blockquote>

<blockquote>
  <p>"[Quote 3]"</p>
  <footer>- Page [X]</footer>
</blockquote>

<h2>🔑 Key Insights</h2>
<h3>Insight 1: [Title]</h3>
<p><strong>Page:</strong> [X]</p>
<p><strong>Insight:</strong> [Description]</p>
<p><strong>Application:</strong> [How can I apply this?]</p>

<h3>Insight 2: [Title]</h3>
<p><strong>Page:</strong> [X]</p>
<p><strong>Insight:</strong> [Description]</p>
<p><strong>Application:</strong> [How can I apply this?]</p>

<h2>📝 Chapter Notes</h2>
<h3>Chapter 1: [Title]</h3>
<ul>
  <li>[Key point 1]</li>
  <li>[Key point 2]</li>
  <li>[Key point 3]</li>
</ul>

<h3>Chapter 2: [Title]</h3>
<ul>
  <li>[Key point 1]</li>
  <li>[Key point 2]</li>
  <li>[Key point 3]</li>
</ul>

<h2>🎯 Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>[Action based on the book]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Habit to implement]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Further research to do]</p></li>
</ul>

<h2>🔗 Related Reading</h2>
<ul>
  <li>[Related book/article 1]</li>
  <li>[Related book/article 2]</li>
  <li>[Related book/article 3]</li>
</ul>

<h2>💭 Personal Reflection</h2>
<p>[What did this book mean to you? How did it change your perspective?]</p>`,
    tags: ['learning', 'books', 'notes'],
    is_public: true
  },
  {
    name: 'Research Notes',
    description: 'Academic or professional research template with structured sections',
    category: 'learning',
    content: `<h1>🔬 Research Notes: [Topic]</h1>

<h2>📋 Research Overview</h2>
<p><strong>Research Question:</strong> [Your main research question]</p>
<p><strong>Hypothesis:</strong> [Your hypothesis if applicable]</p>
<p><strong>Started:</strong> [Date]</p>
<p><strong>Status:</strong> [In Progress/Complete]</p>

<h2>🎯 Objectives</h2>
<ol>
  <li>[Primary objective]</li>
  <li>[Secondary objective]</li>
  <li>[Additional objective]</li>
</ol>

<h2>📚 Sources</h2>
<h3>Primary Sources</h3>
<ol>
  <li><strong>[Author, Year]:</strong> [Title] - [Key findings/relevance]</li>
  <li><strong>[Author, Year]:</strong> [Title] - [Key findings/relevance]</li>
  <li><strong>[Author, Year]:</strong> [Title] - [Key findings/relevance]</li>
</ol>

<h3>Secondary Sources</h3>
<ol>
  <li><strong>[Author, Year]:</strong> [Title] - [Key findings/relevance]</li>
  <li><strong>[Author, Year]:</strong> [Title] - [Key findings/relevance]</li>
</ol>

<h2>🔍 Key Findings</h2>
<h3>Finding 1: [Title]</h3>
<p><strong>Source:</strong> [Citation]</p>
<p><strong>Evidence:</strong> [Description of evidence]</p>
<p><strong>Significance:</strong> [Why this matters]</p>

<h3>Finding 2: [Title]</h3>
<p><strong>Source:</strong> [Citation]</p>
<p><strong>Evidence:</strong> [Description of evidence]</p>
<p><strong>Significance:</strong> [Why this matters]</p>

<h2>📊 Data & Evidence</h2>
<table>
  <tr>
    <th>Data Point</th>
    <th>Source</th>
    <th>Value</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td>[Data point 1]</td>
    <td>[Source]</td>
    <td>[Value]</td>
    <td>[Context/notes]</td>
  </tr>
  <tr>
    <td>[Data point 2]</td>
    <td>[Source]</td>
    <td>[Value]</td>
    <td>[Context/notes]</td>
  </tr>
</table>

<h2>🤔 Analysis & Interpretation</h2>
<h3>Patterns Identified</h3>
<ul>
  <li>[Pattern 1]</li>
  <li>[Pattern 2]</li>
  <li>[Pattern 3]</li>
</ul>

<h3>Gaps in Research</h3>
<ul>
  <li>[Gap 1]</li>
  <li>[Gap 2]</li>
</ul>

<h3>Contradictions</h3>
<ul>
  <li>[Contradiction 1 and possible explanations]</li>
  <li>[Contradiction 2 and possible explanations]</li>
</ul>

<h2>💡 Insights & Conclusions</h2>
<h3>Main Conclusions</h3>
<ol>
  <li>[Conclusion 1]</li>
  <li>[Conclusion 2]</li>
  <li>[Conclusion 3]</li>
</ol>

<h3>Implications</h3>
<ul>
  <li><strong>Theoretical:</strong> [How this affects theory]</li>
  <li><strong>Practical:</strong> [How this can be applied]</li>
  <li><strong>Future Research:</strong> [What should be studied next]</li>
</ul>

<h2>📖 Methodology Notes</h2>
<p><strong>Approach:</strong> [Research methodology used]</p>
<p><strong>Tools:</strong> [Research tools and databases]</p>
<p><strong>Limitations:</strong> [Any limitations in your research]</p>

<h2>✅ Next Steps</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>[Next research task]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Additional sources to review]</p></li>
  <li data-type="taskItem" data-checked="false"><p>[Analysis to complete]</p></li>
</ul>`,
    tags: ['research', 'academic', 'analysis'],
    is_public: true
  }
]

export const DEFAULT_CATEGORIES: Omit<TemplateCategory, 'id' | 'created' | 'updated' | 'user'>[] = [
  {
    name: 'Meeting',
    description: 'Templates for meetings, stand-ups, and collaborative sessions',
    icon: 'users',
    color: '#3b82f6'
  },
  {
    name: 'Project',
    description: 'Project planning, tracking, and management templates',
    icon: 'briefcase',
    color: '#10b981'
  },
  {
    name: 'Personal',
    description: 'Personal development, journaling, and self-reflection templates',
    icon: 'user',
    color: '#8b5cf6'
  },
  {
    name: 'Learning',
    description: 'Educational, research, and knowledge capture templates',
    icon: 'book-open',
    color: '#f59e0b'
  }
]

export async function setupDefaultTemplates(): Promise<void> {
  try {
    // This setup should run only once. Check if default categories or templates already exist.
    const checkCategories = await pb.collection(templateCategoriesCollection).getList(1, 1, { filter: 'is_public=true' });
    const checkTemplates = await pb.collection(templatesCollection).getList(1, 1, { filter: 'is_public=true' });

    if (checkCategories.totalItems > 0 || checkTemplates.totalItems > 0) {
      console.log('Default public templates/categories already exist.');
      return;
    }

    console.log('Setting up default public templates and categories...');

    // Create default categories first, without a user relation
    const categoryPromises = DEFAULT_CATEGORIES.map(category => 
      pb.collection(templateCategoriesCollection).create({ ...category, is_public: true })
      .catch(error => {
        // It's possible another request is doing this at the same time. Ignore unique name errors.
        if (!error.message?.includes('unique')) {
          console.warn('Failed to create default category:', category.name, error)
        }
        return null
      })
    );
    await Promise.all(categoryPromises);

    // Create default templates, without a user relation
    const templatePromises = DEFAULT_TEMPLATES.map(template => 
      pb.collection(templatesCollection).create(template) // is_public is already true
      .catch(error => {
        if (!error.message?.includes('unique')) {
          console.warn('Failed to create default template:', template.name, error)
        }
        return null
      })
    );
    await Promise.all(templatePromises);

    console.log('Default public templates and categories should now be available.');
  } catch (error) {
    console.warn('Failed to setup default templates:', error);
    // Don't throw error - this is not critical functionality
  }
}

export async function autoSetupTemplatesIfNeeded() {
  try {
    // We run this without checking, setupDefaultTemplates now checks for existence.
    await setupDefaultTemplates()
  } catch (error) {
    console.error('Auto-setup failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('404') || errorMessage.includes('collection')) {
      console.warn('Templates collections not found - they need to be created in PocketBase admin')
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      console.warn('Authentication or permission error setting up templates')
    } else {
      console.warn('Unknown error during template setup:', errorMessage)
    }
  }
} 