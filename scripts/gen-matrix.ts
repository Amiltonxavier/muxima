import {
	ACCESS_ROLES,
	ALL_PERMISSIONS,
	getSeedRolePermissions,
	ROLE_NAMES,
} from "../packages/permissions/src/index";

const m = getSeedRolePermissions();
console.log(
	"| Permissão | " +
		ACCESS_ROLES.map((r) => `${ROLE_NAMES[r]} (\`${r}\`)`).join(" | ") +
		" |",
);
console.log("| --- | " + ACCESS_ROLES.map(() => ":---:").join(" | ") + " |");
for (const p of ALL_PERMISSIONS) {
	console.log(
		`| \`${p}\` | ` +
			ACCESS_ROLES.map((r) =>
				(m[r] as readonly string[]).includes(p) ? "✅" : "—",
			).join(" | ") +
			" |",
	);
}
console.log(
	"| **Total** | " +
		ACCESS_ROLES.map((r) => `**${m[r].length}**`).join(" | ") +
		" |",
);
