import { create } from "zustand";
import { shareNote } from "@/lib/actions";
import { pb } from "@/lib/pocketbase";

type ShareNoteState = {
	isOpen: boolean;
	isLoading: boolean;
	noteId: string | null;
	publicId: string | null;
	onOpen: (noteId: string, isPublic?: boolean) => void;
	onClose: () => void;
	generateLink: (noteId: string) => void;
};

export const useShareNote = create<ShareNoteState>((set) => ({
	isOpen: false,
	isLoading: false,
	noteId: null,
	publicId: null,
	onOpen: (noteId, isPublic) =>
		set({ isOpen: true, noteId, publicId: isPublic ? noteId : null }),
	onClose: () =>
		set({ isOpen: false, noteId: null, publicId: null, isLoading: false }),
	generateLink: async (noteId) => {
		set({ isLoading: true });
		try {
			const authToken = pb.authStore.token;
			const sharedId = await shareNote(noteId, authToken);
			
			if (sharedId) {
				set({ publicId: sharedId });
			}
		} catch (error) {
			console.error("Failed to generate link:", error);
		} finally {
			set({ isLoading: false });
		}
	},
})); 