export const ACTION_TYPE = {
    VIEW: 'view',
    UPDATE: 'update',
    DELETE: 'delete',
} as const;

export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];