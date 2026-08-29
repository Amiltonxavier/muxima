import { useId } from "react";

/**
 * Helper hook for associating footer buttons with a form in the Body.
 *
 * ```tsx
 * const { formId } = useFormDialog();
 *
 * <AppDialog.Body>
 *   <form id={formId} onSubmit={handleSubmit(onSubmit)}>...</form>
 * </AppDialog.Body>
 * <AppDialog.Footer>
 *   <button form={formId} type="submit">Salvar</button>
 * </AppDialog.Footer>
 * ```
 */
export function useFormDialog() {
	const id = useId();
	const formId = `app-dialog-form-${id}`;
	return { formId };
}
