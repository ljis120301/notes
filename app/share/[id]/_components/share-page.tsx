"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Link } from "@/components/tiptap-extension/link-extension";
import { Note } from "@/lib/pocketbase";
import { memo } from "react";

// Import necessary styles
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/styles/_variables.scss";

type Props = {
	note: Note;
};

// Memoize the component to prevent unnecessary re-renders
export const SharePage = memo(function SharePage({ note }: Props) {
	const editor = useEditor({
		editable: false,
		content: note.content,
		extensions: [
			StarterKit,
			Image.configure({
				HTMLAttributes: {
					class: "tiptap-image",
				},
			}),
			TaskList,
			TaskItem.configure({
				nested: true,
			}),
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Typography,
			Highlight.configure({
				multicolor: true,
			}),
			Subscript,
			Superscript,
			Underline,
			TextStyle,
			FontFamily,
			Link.configure({
				openOnClick: true,
				HTMLAttributes: {
					class: "tiptap-link",
				},
			}),
		],
	});

	return (
		<div className="container mx-auto p-4 max-w-4xl">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-2">{note.title}</h1>
				<p className="text-muted-foreground">Shared note • Read-only</p>
			</div>
			<div className="prose prose-lg max-w-none">
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}); 