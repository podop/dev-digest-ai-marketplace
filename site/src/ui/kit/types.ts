import { type IconName } from "../icons";

export type TabDef = string | { key: string; label: string; icon?: IconName; count?: number };
