import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";

type QueryStateProps<T> = {
	state: {
		isLoading: boolean;
		isError: boolean;
		isEmpty: boolean;
		hasData: boolean;
		error?: unknown;
		data?: T;
	};
	children: React.ReactNode;
	/**
	 * Overrides the generic copy with something that names the actual problem or
	 * the next step. Optional, so existing callers keep their current wording.
	 */
	errorMessage?: string;
	emptyMessage?: string;
	/** Rendered as a retry action on the error state. */
	onRetry?: () => void;
};

export function QueryState<T>({
	state,
	children,
	errorMessage,
	emptyMessage,
	onRetry,
}: QueryStateProps<T>) {
	if (state.isLoading) {
		return <LoadingState />;
	}

	if (state.isError) {
		return <ErrorState message={errorMessage} onRetry={onRetry} />;
	}

	if (state.isEmpty) {
		return <EmptyState message={emptyMessage} />;
	}

	return children;
}
