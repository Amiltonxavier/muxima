import type { RichTextNode } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import { cn } from "@muxima/ui/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Heading2,
	Heading3,
	Italic,
	List,
	ListOrdered,
	Minus,
	Quote,
	Redo2,
	RemoveFormatting,
	Strikethrough,
	Underline,
	Undo2,
} from "lucide-react";
import { useEffect } from "react";
import { EMPTY_RICH_TEXT } from "@/utils/rich-text";

type RichTextEditorProps = {
	value: RichTextNode | null;
	onChange?: (doc: RichTextNode) => void;
	placeholder?: string;
	disabled?: boolean;
	/** Renders the document without a toolbar or editing affordances. */
	readOnly?: boolean;
	className?: string;
};

type ToolbarAction = {
	label: string;
	icon: React.ReactNode;
	isActive: () => boolean;
	action: () => void;
};

export function RichTextEditor({
	value,
	onChange,
	placeholder = "Escreva aqui os seus votos...",
	disabled = false,
	readOnly = false,
	className,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [StarterKit],
		content: value ?? EMPTY_RICH_TEXT,
		editable: !readOnly && !disabled,
		immediatelyRender: false,
		onUpdate: ({ editor: instance }) => {
			onChange?.(instance.getJSON() as RichTextNode);
		},
	});

	// Keep the document in sync when switching between records or recovering
	// a local draft, without clobbering the caret while the user types.
	useEffect(() => {
		if (!editor) return;
		const next = value ?? EMPTY_RICH_TEXT;
		if (JSON.stringify(editor.getJSON()) === JSON.stringify(next)) return;
		editor.commands.setContent(next, { emitUpdate: false });
	}, [editor, value]);

	useEffect(() => {
		editor?.setEditable(!readOnly && !disabled);
	}, [editor, readOnly, disabled]);

	if (readOnly) {
		return (
			<div
				className={cn(
					"px-4 py-3 text-sm leading-relaxed",
					// Stops long words (URLs, long names) from widening the
					// container and pushing the dialog out of the viewport.
					"wrap-anywhere max-w-full break-words",
					"[&_a]:break-all [&_a]:text-blue-600 [&_a]:underline",
					"[&_blockquote]:border-muted-foreground/40 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
					"[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:break-words [&_h1]:font-semibold [&_h1]:text-lg",
					"[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:break-words [&_h2]:font-semibold [&_h2]:text-base",
					"[&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:break-words [&_h3]:font-semibold [&_h3]:text-sm",
					"[&_hr]:my-4",
					"[&_li]:ml-4 [&_li]:list-disc",
					"[&_ol>li]:list-decimal",
					"[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-2",
					"[&_pre]:max-w-full [&_pre]:overflow-x-auto",
					"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
					"[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
					"[&_strong]:font-semibold",
					className,
				)}
			>
				<EditorContent editor={editor} className="max-w-full" />
			</div>
		);
	}

	const actions: ToolbarAction[] = editor
		? [
				{
					label: "Negrito",
					icon: <Bold className="h-4 w-4" />,
					isActive: () => editor.isActive("bold"),
					action: () => editor.chain().focus().toggleBold().run(),
				},
				{
					label: "Itálico",
					icon: <Italic className="h-4 w-4" />,
					isActive: () => editor.isActive("italic"),
					action: () => editor.chain().focus().toggleItalic().run(),
				},
				{
					label: "Sublinhado",
					icon: <Underline className="h-4 w-4" />,
					isActive: () => editor.isActive("underline"),
					action: () => editor.chain().focus().toggleUnderline().run(),
				},
				{
					label: "Rasurado",
					icon: <Strikethrough className="h-4 w-4" />,
					isActive: () => editor.isActive("strike"),
					action: () => editor.chain().focus().toggleStrike().run(),
				},
				{
					label: "Título 2",
					icon: <Heading2 className="h-4 w-4" />,
					isActive: () => editor.isActive("heading", { level: 2 }),
					action: () =>
						editor.chain().focus().toggleHeading({ level: 2 }).run(),
				},
				{
					label: "Título 3",
					icon: <Heading3 className="h-4 w-4" />,
					isActive: () => editor.isActive("heading", { level: 3 }),
					action: () =>
						editor.chain().focus().toggleHeading({ level: 3 }).run(),
				},
				{
					label: "Lista",
					icon: <List className="h-4 w-4" />,
					isActive: () => editor.isActive("bulletList"),
					action: () => editor.chain().focus().toggleBulletList().run(),
				},
				{
					label: "Lista numerada",
					icon: <ListOrdered className="h-4 w-4" />,
					isActive: () => editor.isActive("orderedList"),
					action: () => editor.chain().focus().toggleOrderedList().run(),
				},
				{
					label: "Citação",
					icon: <Quote className="h-4 w-4" />,
					isActive: () => editor.isActive("blockquote"),
					action: () => editor.chain().focus().toggleBlockquote().run(),
				},
				{
					label: "Divisor",
					icon: <Minus className="h-4 w-4" />,
					isActive: () => false,
					action: () => editor.chain().focus().setHorizontalRule().run(),
				},
				{
					label: "Limpar formatação",
					icon: <RemoveFormatting className="h-4 w-4" />,
					isActive: () => false,
					action: () => editor.chain().focus().unsetAllMarks().run(),
				},
				{
					label: "Anular",
					icon: <Undo2 className="h-4 w-4" />,
					isActive: () => false,
					action: () => editor.chain().focus().undo().run(),
				},
				{
					label: "Refazer",
					icon: <Redo2 className="h-4 w-4" />,
					isActive: () => false,
					action: () => editor.chain().focus().redo().run(),
				},
			]
		: [];

	return (
		<div
			className={cn(
				"rounded-md border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
				disabled && "opacity-60",
				className,
			)}
		>
			<div className="flex flex-wrap items-center gap-1 border-b p-1">
				{actions.map((action) => (
					<Button
						key={action.label}
						type="button"
						variant={action.isActive() ? "secondary" : "ghost"}
						size="icon-sm"
						aria-label={action.label}
						title={action.label}
						aria-pressed={action.isActive()}
						disabled={disabled}
						onClick={action.action}
					>
						{action.icon}
					</Button>
				))}
			</div>
			<div className="relative">
				{editor?.isEmpty ? (
					<span className="pointer-events-none absolute top-3 left-3 text-muted-foreground text-sm">
						{placeholder}
					</span>
				) : null}
				{/*
				 * Long words (URLs, names without spaces) would otherwise push
				 * the dialog sideways, so the editable area breaks them and
				 * scrolls internally instead of growing without bound.
				 */}
				<EditorContent
					editor={editor}
					className={cn(
						"px-3 py-2 text-sm",
						// Bounds the editable area so a long document scrolls
						// inside the field instead of growing the dialog. The
						// min-height keeps an empty document clickable.
						"max-h-[45vh] min-h-[45vh] overflow-y-auto",
						"[&_.ProseMirror]:min-w-0 [&_.ProseMirror]:max-w-full",
						"[&_.ProseMirror]:wrap-anywhere [&_.ProseMirror]:break-words",
						"[&_.ProseMirror]:whitespace-pre-wrap",
						"[&_.ProseMirror_a]:break-all",
						"[&_.ProseMirror_blockquote]:pl-3",
						"[&_.ProseMirror_code]:break-words",
						"[&_.ProseMirror_h1]:break-words [&_.ProseMirror_h2]:break-words [&_.ProseMirror_h3]:break-words",
						"[&_.ProseMirror_li]:break-words",
						"[&_.ProseMirror_pre]:max-w-full [&_.ProseMirror_pre]:overflow-x-auto",
					)}
				/>
			</div>
		</div>
	);
}
