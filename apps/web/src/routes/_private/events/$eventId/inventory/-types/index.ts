import { ACTION_TYPES_EVENT } from "../-constants";


export type ActionTypeEvent =
	(typeof ACTION_TYPES_EVENT)[keyof typeof ACTION_TYPES_EVENT];