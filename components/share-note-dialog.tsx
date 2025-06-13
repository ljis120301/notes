"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useShareNote } from "@/hooks/use-share-note";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const ShareNoteDialog = () => {
	const { isOpen, onClose, noteId, publicId, generateLink, isLoading } =
		useShareNote();

	const shareableLink = publicId
		? `${window.location.origin}/share/${publicId}`
		: "";

	const handleCopy = () => {
		navigator.clipboard.writeText(shareableLink);
		toast.success("Link copied to clipboard");
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Share Note</DialogTitle>
				</DialogHeader>
				{publicId ? (
					<div className="flex flex-col gap-4">
						<p>Anyone with the link can view this note.</p>
						<div className="flex gap-2">
							<Input value={shareableLink} readOnly />
							<Button onClick={handleCopy}>Copy</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						<p>Create a public link to share your note.</p>
						<Button
							onClick={() => noteId && generateLink(noteId)}
							disabled={isLoading}
						>
							{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isLoading ? "Creating..." : "Create Public Link"}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}; 