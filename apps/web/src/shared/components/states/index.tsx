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
};

export function QueryState<T>({ state, children }: QueryStateProps<T>) {
	if (state.isLoading) {
		return <LoadingState />;
	}

	if (state.isError) {
		return <ErrorState />;
	}

	if (state.isEmpty) {
		return <EmptyState />;
	}

	return children;
}
