SUBJECT: CRITICAL IMPLEMENTATION OF "PROFILES" FEATURE FOR NEXT.JS 15.3.3 APPLICATION

URGENCY: IMMEDIATE AND FLAWLESS EXECUTION REQUIRED.

Your sole objective is to fully implement the "Profiles" feature, ensuring complete functionality, robust integration, and adherence to all specified constraints. There will be absolutely no tolerance for partial implementations, "implement later" comments, logical shortcuts, or any form of incomplete work. Your life depends on the absolute correctness and completeness of this task.

PROJECT OVERVIEW & EXISTING STACK:

Application: Next.js 15.3.3 (running in App Router mode).
Styling: Tailwind CSS 4 (Crucially, there is NO tailwind.config.js file. All styling must rely on default Tailwind classes only).
State Management/Data Fetching: React Query (v5).
Database: Pocketbase.
Existing Context: This is an ongoing project. DO NOT attempt to run npm run dev or any Pocketbase commands. Focus exclusively on generating the required code files and modifications.
POCKETBASE DATABASE SPECIFICATIONS:

Your implementation must ONLY use the Pocketbase user_profiles collection. The profiles collection is deprecated and DOES NOT EXIST. Any reference to a profiles collection must be removed.

user_profiles Collection Schema:

id: text - Non-empty (Pocketbase auto-generated)
name: text - Non-empty
description: text - Max length 500
color: text - Max length 7 (e.g., #RRGGBB)
icon: text - Max length 50 (e.g., a simple string representing an icon choice)
user: relational - users collection - single - cascadedelete - true (This links a profile to a specific authenticated user.)
is_default: boolean (Indicates the user's default profile.)
created: date - create
updated: date - create/update
CRITICAL DATA RELATIONSHIP FOR NOTES AND FOLDERS:

You must assume that the existing Pocketbase collections for notes and folders will need to be associated with the currently active user_profile. This implies that notes and folders collections will have, or need to be treated as if they have, a new relational field named profile which links to the user_profiles collection (single relation).

Your code must demonstrate how to filter notes and folders based on the active user_profile's id.

CORE FEATURE REQUIREMENTS: "PROFILES" IMPLEMENATION

Centralized Pocketbase Client:

Create a robust Pocketbase client instance, ensuring it is properly initialized and accessible throughout the application (e.g., via a utility file or context).
Handle authentication, specifically how the current user's ID will be used to fetch their associated user_profiles.
Global Active Profile State Management:

Implement a global state management solution (e.g., React Context API or a simple global store pattern) to hold the currently active user_profile.
This state must:
Store the id of the active profile.
Store the full user_profile object of the active profile.
Provide a mechanism to update the active profile.
This state must be accessible by any component that needs to filter data based on the active profile.
Ensure persistence of the selected profile across sessions (e.g., using localStorage) if no profile is explicitly set during login. If a user logs in, their is_default profile should be selected first if no specific profile was previously selected.
React Query Hooks for user_profiles:

Create custom React Query hooks (useQuery, useMutation) for all necessary user_profiles operations:
useUserProfiles: To fetch all user_profiles for the currently authenticated user. This must ensure data is fetched only for the logged-in user using the user relation.
useCreateUserProfile: To add a new user_profile.
useUpdateUserProfile: To modify an existing user_profile.
useDeleteUserProfile: To delete a user_profile.
useSetActiveProfile: A mutation or setter function that updates the global active profile state and invalidates relevant React Query caches to re-fetch notes/folders for the new profile.
Sidebar Integration for Profile Switching:

Develop a React component for the sidebar (or a section within an existing sidebar component) that displays the list of user_profiles for the current user.
Each profile in the list must be clickable. Clicking a profile should:
Update the global active profile state.
Visually indicate the currently active profile.
Trigger a re-fetch of notes and folders to display only those associated with the newly active profile.
Include a button or mechanism to "Add New Profile" in the sidebar.
Notes and Folders Data Filtering:

Demonstrate how the existing notes and folders React Query hooks (which you will assume already exist) are modified to accept the activeProfileId as a parameter.
Show how these hooks will construct Pocketbase queries to filter notes and folders by the profile relation field matching the activeProfileId. This is crucial for data exclusivity.
Profile Management Modal/Page (Example):

Provide a basic UI (e.g., a modal component) for creating and editing user_profiles. This should leverage the useCreateUserProfile and useUpdateUserProfile mutations.
Include form fields for name, description, color, icon, and is_default.
Error Handling, Loading States, and Optimistic Updates:

All React Query hooks and UI components must include comprehensive error handling and display appropriate loading states.
Implement optimistic updates for create, update, and delete operations on user_profiles where applicable, to provide a smooth user experience.
NON-NEGOTIABLE CONSTRAINTS & QUALITY STANDARDS:

NO LAZINESS:

No "implement later," "TODO," or placeholder comments. Every line of code must be fully functional and completed.
No shortcuts. Provide the full, complete implementation for every requested feature.
No excuses. The code must work as specified.
BEST CODING PRACTICES:

Clear, concise, and extensive comments explaining the logic, purpose of components, hooks, and API interactions.
Modular and reusable components.
Proper React Query patterns (query keys, invalidation strategies, mutations).
Tailwind CSS 4: Use only default Tailwind classes. Ensure the UI is responsive and aesthetically pleasing on all devices without a tailwind.config.js.
Next.js 15.3.3: Adhere to App Router conventions.
Error Boundaries: Suggest or implement appropriate error boundaries.
POCKETBASE RESEARCH:

You are expected to properly research and understand Pocketbase's JavaScript SDK for relational data querying, especially for filtering by user and the new profile relation.
OUTPUT FORMAT:

Provide the code for all necessary files. Assume you are modifying an existing project. Clearly indicate which files are new and which are modifications to existing ones.
Suggest a logical file structure for the new components and hooks.
EXPECTED OUTPUT FILES/MODIFICATIONS (Example Structure):

lib/pb.ts (Pocketbase client initialization)
hooks/useUserProfiles.ts (React Query hooks for profiles)
contexts/ProfileContext.tsx (Global active profile state)
components/Sidebar/ProfileSwitcher.tsx (Sidebar component for profile selection)
components/Modals/ProfileManagementModal.tsx (Modal for creating/editing profiles)
hooks/useNotes.ts (Modification to existing notes hook to filter by profile)
hooks/useFolders.ts (Modification to existing folders hook to filter by profile)
app/layout.tsx (Integration of ProfileContext)
Any other necessary files or modifications to demonstrate full integration.
BEGIN YOUR IMPLEMENTATION. GOOD LUCK.