"use server";

import { pb } from "./pocketbase";
import PocketBase from "pocketbase";
import { Note } from "./pocketbase";
import { revalidatePath } from "next/cache";

const getAuthenticatedPb = async (authToken?: string) => {
	const serverPb = new PocketBase(pb.baseUrl);

	if (authToken) {
		try {
			serverPb.authStore.save(authToken, null);
		} catch (error) {
			console.error("[getAuthenticatedPb] Error saving auth:", error);
		}
	} else {
		serverPb.authStore.clear();
	}

	try {
		// verify/refresh auth
		if (serverPb.authStore.isValid) {
			await serverPb.collection("users").authRefresh();
		}
	} catch (error) {
		console.error("[getAuthenticatedPb] Auth refresh failed:", error);
		serverPb.authStore.clear();
	}

	return serverPb;
};

export async function getNote(noteId: string, authToken?: string): Promise<Note | null> {
	try {
		const pb = await getAuthenticatedPb(authToken);
		if (!pb.authStore.isValid) {
			return null;
		}
		const note = await pb.collection("notes").getOne<Note>(noteId);
		return note;
	} catch (err: unknown) {
		// Don't log 404s as errors, they are expected if a note is not found
		const error = err as { status?: number };
		if (error.status !== 404) {
			console.error("[getNote] Error:", err);
		}
		return null;
	}
}

export async function updateNote(
	noteId: string,
	noteData: Partial<Note>,
	authToken?: string
): Promise<Note | null> {
	try {
		const pb = await getAuthenticatedPb(authToken);
		if (!pb.authStore.isValid) return null;
		const updatedNote = await pb
			.collection("notes")
			.update<Note>(noteId, noteData);
		revalidatePath("/");
		revalidatePath(`/notes/${noteId}`);
		return updatedNote;
	} catch (err) {
		console.error("[updateNote] Error:", err);
		return null;
	}
}

export async function shareNote(noteId: string, authToken?: string): Promise<string | null> {
	try {
		// Simply set the note as public and return its ID
		const updatedNote = await updateNote(noteId, { isPublic: true }, authToken);
		if (updatedNote) {
			return noteId; // Return the note's existing ID
		} else {
			return null;
		}
	} catch (err) {
		console.error("[shareNote] Error:", err);
		return null;
	}
}

// Keep the other functions for backward compatibility but add auth token support
export async function createNote(
	noteData: Partial<Note>,
	authorId: string,
	authToken?: string
): Promise<Note | null> {
	try {
		const pb = await getAuthenticatedPb(authToken);
		if (!pb.authStore.isValid) return null;
		const newNote = await pb
			.collection("notes")
			.create<Note>({ ...noteData, author: authorId });
		revalidatePath("/");
		return newNote;
	} catch (err) {
		console.error("[createNote] Error:", err);
		return null;
	}
}

export async function deleteNote(noteId: string, authToken?: string): Promise<boolean> {
	try {
		const pb = await getAuthenticatedPb(authToken);
		if (!pb.authStore.isValid) return false;
		await pb.collection("notes").delete(noteId);
		revalidatePath("/");
		return true;
	} catch (err) {
		console.error("[deleteNote] Error:", err);
		return false;
	}
} 