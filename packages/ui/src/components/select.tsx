import { Select as HeadlessSelect } from "@headlessui/react";
import { cn } from "@muxima/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Select do design system, construído sobre o `Select` do `@headlessui/react`
 * (que renderiza um `<select>` nativo estilizável).
 *
 * A API pública mantém-se igual à da versão anterior (Base UI) para não
 * alterar os ~47 pontos de consumo catalogados em `apps/web/docs/select-audit.md`:
 *
 * - `onValueChange?: (value: string) => void` — adapter sobre o `onChange`
 *   nativo (o evento entrega sempre uma string).
 * - `SelectTrigger` — recebe `id`/`className`/`disabled` e regista-os no
 *   `Select` via context (o wrapper é o próprio trigger visual); os filhos
 *   fazem passthrough (o `SelectValue` monta via portal).
 * - `SelectValue` — via portal para a "slot" do trigger: mostra o
 *   `placeholder` quando nenhuma opção corresponde ao valor actual
 *   (`selectedIndex === -1`); caso contrário o `<select>` nativo mostra o
 *   texto da opção seleccionada (incl. o caso `value=""` com
 *   `<SelectItem value="">`, que mostra o label do item).
 * - `SelectContent` — passthrough (os `<option>` são filhos directos).
 * - `SelectItem` — `<option>` nativo.
 * - `SelectGroup`/`SelectLabel` — `<optgroup>`; `SelectSeparator` e os botões
 *   de scroll são shims sem efeito (sem equivalente em select nativo).
 */

type TriggerProps = {
	className?: string;
	id?: string;
	disabled?: boolean;
};

const SelectTriggerPropsContext = React.createContext<
	(props: TriggerProps) => void
>(() => {});

const SelectContext = React.createContext<{
	slot: HTMLSpanElement | null;
	selectElement: HTMLSelectElement | null;
	value: unknown;
} | null>(null);

type SelectProps = Omit<
	React.ComponentPropsWithoutRef<"select">,
	"onChange" | "size"
> & {
	/** Adapter da API antiga sobre o `onChange` nativo. */
	onValueChange?: (value: string) => void;
	/**
	 * Compatibilidade com a API antiga (Base UI): os `items` deixaram de ser
	 * necessários — o `<select>` nativo mostra o texto da opção escolhida.
	 * São aceites e ignorados.
	 */
	items?: unknown;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			onValueChange,
			items: _items,
			className = "",
			disabled,
			children,
			...props
		},
		ref,
	) => {
		const [slot, setSlot] = React.useState<HTMLSpanElement | null>(null);
		const [selectElement, setSelectElement] =
			React.useState<HTMLSelectElement | null>(null);
		const [triggerProps, setTriggerProps] = React.useState<TriggerProps>({});

		const handleRef = (node: HTMLSelectElement | null) => {
			setSelectElement(node);
			if (typeof ref === "function") {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		};

		const triggerDisabled = disabled || triggerProps.disabled;

		return (
			<SelectTriggerPropsContext.Provider value={setTriggerProps}>
				<SelectContext.Provider
					value={{ slot, selectElement, value: props.value }}
				>
					<span
						className={cn(
							"relative inline-flex h-9 min-w-40 select-none items-center whitespace-nowrap border border-neutral-950 bg-white pr-8 pl-2.5 font-normal text-neutral-950 text-sm focus-within:outline-2 focus-within:outline-neutral-950 focus-within:-outline-offset-1 hover:bg-neutral-100 active:bg-neutral-200",
							triggerDisabled
								? "cursor-not-allowed border-neutral-500 text-neutral-500"
								: "cursor-pointer",
							triggerProps.className,
							className,
						)}
					>
						<HeadlessSelect
							ref={handleRef}
							id={triggerProps.id}
							disabled={triggerDisabled}
							className="h-full w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed"
							{...(onValueChange
								? {
										onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
											onValueChange(event.target.value),
									}
								: {})}
							{...props}
						>
							{children}
						</HeadlessSelect>
						<ChevronDown
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2"
						/>
						{/* Zona onde o `SelectValue` (portal) desenha o placeholder. */}
						<span
							ref={setSlot}
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 flex items-center pr-8 pl-2.5"
						/>
					</span>
				</SelectContext.Provider>
			</SelectTriggerPropsContext.Provider>
		);
	},
);

Select.displayName = "Select";

const SelectTrigger = ({
	className,
	id,
	disabled,
	children,
}: TriggerProps & { children?: React.ReactNode }) => {
	const setTriggerProps = React.useContext(SelectTriggerPropsContext);

	React.useEffect(() => {
		setTriggerProps({ className, id, disabled });
	}, [setTriggerProps, className, id, disabled]);

	// Sem DOM próprio: os filhos (SelectValue) montam via portal na slot.
	return <>{children}</>;
};

const SelectValue = ({
	placeholder,
	children,
}: {
	placeholder?: string;
	children?: React.ReactNode;
}) => {
	const ctx = React.useContext(SelectContext);
	const selectElement = ctx?.selectElement ?? null;
	const [noSelection, setNoSelection] = React.useState(false);

	const value = ctx?.value;

	const update = React.useCallback(() => {
		if (!selectElement) {
			setNoSelection(false);
			return;
		}
		if (
			selectElement.selectedIndex === -1 ||
			// jsdom não marca `selectedIndex === -1` quando o valor controlado
			// não corresponde a nenhuma opção (os browsers marcam); cobrir ambos:
			(value !== undefined &&
				value !== null &&
				String(value) !== selectElement.value)
		) {
			setNoSelection(true);
			return;
		}
		setNoSelection(false);
	}, [selectElement, value]);

	React.useLayoutEffect(() => {
		if (!selectElement) {
			return;
		}
		update();
		selectElement.addEventListener("change", update);
		return () => selectElement.removeEventListener("change", update);
	}, [selectElement, update]);

	// Sincroniza também quando o `value` controlado muda sem `change` event
	// (ex.: reset de formulário, invalidação de query). `update` muda de
	// identidade quando `value` muda, pelo que este efeito re-corre.
	React.useEffect(() => {
		update();
	}, [update]);

	const slot = ctx?.slot;
	if (!slot) {
		return null;
	}

	return createPortal(
		<span className="truncate">
			{noSelection ? (children ?? placeholder ?? "") : null}
		</span>,
		slot,
	);
};

const SelectContent = ({ children }: { children?: React.ReactNode }) => (
	<>{children}</>
);

const SelectItem = ({
	value,
	className: _className,
	children,
	...props
}: {
	value: string;
	className?: string;
	children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<"option">, "value" | "className">) => (
	<option value={value} {...props}>
		{children}
	</option>
);

const SelectGroup = ({
	children,
	...props
}: React.ComponentPropsWithoutRef<"optgroup">) => (
	<optgroup {...props}>{children}</optgroup>
);

const SelectLabel = ({
	children,
	...props
}: React.ComponentPropsWithoutRef<"optgroup">) => (
	<optgroup {...props}>
		{typeof children === "string" ? null : children}
	</optgroup>
);

const SelectSeparator = () => null;
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

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
