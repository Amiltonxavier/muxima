import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@muxima/ui/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Backdrop>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Backdrop
		ref={ref}
		className={cn(
			"data-closed:fade-out-0 data-open:fade-in-0 data-starting-style:fade-in-0 data-ending-style:fade-out-0 fixed inset-0 z-50 bg-black/80 data-closed:animate-out data-ending-style:animate-out data-open:animate-in data-starting-style:animate-in",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Popup>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, children, ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Popup
			ref={ref}
			className={cn(
				"data-closed:fade-out-0 data-open:fade-in-0 data-starting-style:fade-in-0 data-ending-style:fade-out-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-starting-style:zoom-in-95 data-ending-style:zoom-out-95 data-closed:slide-out-to-left-1/2 data-closed:slide-out-to-top-[48%] data-open:slide-in-from-left-1/2 data-open:slide-in-from-top-[48%] data-starting-style:slide-in-from-left-1/2 data-starting-style:slide-in-from-top-[48%] data-ending-style:slide-out-to-left-1/2 data-ending-style:slide-out-to-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-closed:animate-out data-ending-style:animate-out data-open:animate-in data-starting-style:animate-in",
				className,
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground">
				<X className="h-4 w-4" />
				<span className="sr-only">Fechar</span>
			</DialogPrimitive.Close>
		</DialogPrimitive.Popup>
	</DialogPortal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-1.5 text-center sm:text-left",
			className,
		)}
		{...props}
	/>
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"font-semibold text-lg leading-none tracking-tight",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
DialogDescription.displayName = "DialogDescription";

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
