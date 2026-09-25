import { useState } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../-constants/schedule.constants";
import type { ScheduleTabId } from "../-types/schedule.types";

export function useScheduleView() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);

	const handlePageChange = (value: number) => {
		setPage(value);
	};

	const handleLimitChange = (value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	};

	return {
		page,
		limit,
		setPage: handlePageChange,
		setLimit: handleLimitChange,
	};
}

export function useScheduleTab() {
	const [activeTab, setActiveTab] = useState<ScheduleTabId>("gantt");

	const handleTabChange = (value: string) => {
		setActiveTab(value as ScheduleTabId);
	};

	return {
		activeTab,
		setActiveTab: handleTabChange,
	};
}
