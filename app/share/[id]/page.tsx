import { getNoteByPublicId } from "@/lib/notes-api";
import { SharePage } from "./_components/share-page";
import { notFound } from "next/navigation";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export default async function SharedNotePage({ params }: Props) {
	const { id } = await params;
	console.log("[SharedNotePage] Attempting to fetch note with publicId:", id);
	
	const note = await getNoteByPublicId(id);
	
	console.log("[SharedNotePage] Note fetched:", note ? "found" : "not found");

	if (!note) {
		console.log("[SharedNotePage] Note not found, returning 404");
		return notFound();
	}

	console.log("[SharedNotePage] Rendering note:", note.title);
	return <SharePage note={note} />;
} 