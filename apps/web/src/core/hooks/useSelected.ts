import { useCallback, useState } from "react";

type SelectionState<Item, Action> = {
  item: Item | null;
  action: Action | null;
};

export function useSelected<Item, Action = string>() {
  const [selection, setSelection] = useState<SelectionState<Item, Action>>({
    item: null,
    action: null,
  });

  const onSelect = useCallback((item: Item, action?: Action) => {
    setSelection({
      item,
      action: action ?? null,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({
      item: null,
      action: null,
    });
  }, []);

  return {
    isSelected: selection.item !== null,
    selectedItem: selection.item,
    selectedAction: selection.action,
    onSelect,
    clearSelection,
  };
}
