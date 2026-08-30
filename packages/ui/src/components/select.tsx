import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

const Select = BaseSelect.Root;

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof BaseSelect.Trigger>,
	React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>
>(({ className = "", ...props }, ref) => (
	<BaseSelect.Trigger
		ref={ref}
		className={`flex h-9 min-w-40 select-none items-center justify-between gap-3 whitespace-nowrap border border-neutral-950 bg-white px-2.5 font-normal text-neutral-950 text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-950 focus-visible:-outline-offset-1 active:bg-neutral-200 data-disabled:border-neutral-500 data-pressed:bg-neutral-100 data-disabled:text-neutral-500 ${className}
    `}
		{...props}
	/>
));

SelectTrigger.displayName = BaseSelect.Trigger.displayName;

const SelectValue = BaseSelect.Value;

const SelectContent = React.forwardRef<
	React.ElementRef<typeof BaseSelect.Popup>,
	React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>
>(({ className = "", ...props }, ref) => (
	<BaseSelect.Positioner>
		<BaseSelect.Popup
			ref={ref}
			className={`min-w-[var(--anchor-width)] border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/10 outline-hidden ${className}
      `}
			{...props}
		/>
	</BaseSelect.Positioner>
));

SelectContent.displayName = BaseSelect.Popup.displayName;

const SelectItem = React.forwardRef<
	React.ElementRef<typeof BaseSelect.Item>,
	React.ComponentPropsWithoutRef<typeof BaseSelect.Item>
>(({ className = "", children, ...props }, ref) => (
	<BaseSelect.Item
		ref={ref}
		className={`grid cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 py-1.5 pr-4 pl-2.5 text-neutral-950 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-neutral-950 data-highlighted:text-white data-disabled:opacity-50 ${className}
    `}
		{...props}
	>
		<BaseSelect.ItemIndicator className="col-start-1">
			<Check className="h-4 w-4" />
		</BaseSelect.ItemIndicator>

		<BaseSelect.ItemText className="col-start-2">
			{children}
		</BaseSelect.ItemText>
	</BaseSelect.Item>
));

SelectItem.displayName = BaseSelect.Item.displayName;

const SelectLabel = BaseSelect.Label;
const SelectGroup = BaseSelect.Group;
const SelectSeparator = BaseSelect.Separator;

const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof BaseSelect.ScrollUpArrow>,
	React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollUpArrow>
>((props, ref) => (
	<BaseSelect.ScrollUpArrow
		ref={ref}
		className="flex h-4 w-full items-center justify-center"
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</BaseSelect.ScrollUpArrow>
));

SelectScrollUpButton.displayName = BaseSelect.ScrollUpArrow.displayName;

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof BaseSelect.ScrollDownArrow>,
	React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollDownArrow>
>((props, ref) => (
	<BaseSelect.ScrollDownArrow
		ref={ref}
		className="flex h-4 w-full items-center justify-center"
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</BaseSelect.ScrollDownArrow>
));

SelectScrollDownButton.displayName = BaseSelect.ScrollDownArrow.displayName;

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
