import "@testing-library/jest-dom/vitest";

/**
 * jsdom has no ResizeObserver, and every Bklit chart sizes itself from its
 * parent with one. The stub never fires, so charts render at zero width — which
 * is enough to exercise the surrounding markup and the data contract.
 */
if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
