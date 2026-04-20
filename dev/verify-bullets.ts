
/**
 * Throwaway verification for calcBulletMargin / calcBulletIndent vs. the
 * inline marL/indent logic inside generateXml (src/generators/bullets.ts).
 *
 * Run from repo root:
 *   npx ts-node --compiler-options '{"module":"commonjs","target":"es2017"}' dev/verify-bullets.ts
 *
 * Requires calcBulletMargin / calcBulletIndent to be exported from
 * src/generators/bullets.ts (already done).
 */
import { calcBulletIndent, calcBulletMargin } from '../src/generators/bullets';
import { DEF_BULLET_MARGIN } from '../src/core-enums';
import { valToPts } from '../src/gen-utils';

type InlineResult = { emitted: boolean; marL: number | null; indent: number | null };

// Mirror of the inline marL/indent calculations inside generateXml.
// Returns numbers (not XML strings) and flags cases where inline emits nothing.
function inlineCompute (textPropsOptions: any, bullet: any): InlineResult {
	let defaultMarL = valToPts(DEF_BULLET_MARGIN);
	let marL: number;
	let indent: number;

	if (typeof bullet === 'boolean') {
		if (bullet) {
			defaultMarL = textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0
				? defaultMarL + defaultMarL * textPropsOptions.indentLevel
				: defaultMarL;
			indent = -defaultMarL;
			marL = defaultMarL;
		} else {
			marL = 0;
			indent = 0;
		}
		return { emitted: true, marL, indent };
	} else if (bullet && typeof bullet === 'object') {
		const marginLeft = (typeof bullet.marginLeft === 'number') ? valToPts(bullet.marginLeft) : defaultMarL;
		const indentIncrement = (typeof bullet.indent === 'number') ? valToPts(bullet.indent) : marginLeft;

		if (bullet.type) {
			marL = ((typeof textPropsOptions.indentLevel === 'number') && (textPropsOptions.indentLevel > 0))
				? (marginLeft + (indentIncrement * textPropsOptions.indentLevel))
				: marginLeft;
			indent = -indentIncrement;
		} else {
			// characterCode / code / else branches all use the same formula:
			// marL scales defaultMarL by indentLevel, indent = -defaultMarL (base, never mutated here).
			marL = textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0
				? defaultMarL + defaultMarL * textPropsOptions.indentLevel
				: defaultMarL;
			indent = -defaultMarL;
		}
		return { emitted: true, marL, indent };
	}
	// Not a boolean and not a valid object — inline emits no marL/indent attrs.
	return { emitted: false, marL: null, indent: null };
}

const indentLevels: Array<number | undefined> = [undefined, 0, 1, 3];

const bulletCases: any[] = [
	// invalid shapes — inline emits nothing; skipped in comparison
	undefined,
	null,
	'not a bullet',
	42,
	// boolean
	true,
	false,
	// empty object (falls into else branch)
	{},
	// type variants
	{ type: 'bullet' },
	{ type: 'number' },
	{ type: 'char', characterCode: '2022' },
	{ type: 'checkbox' },
	{ type: 'none' },
	// type + margin/indent overrides
	{ type: 'bullet', marginLeft: 36 },
	{ type: 'bullet', indent: 18 },
	{ type: 'bullet', marginLeft: 36, indent: 18 },
	// characterCode variants (no type) — suspected divergence zone
	{ characterCode: '2022' },
	{ characterCode: '2022', marginLeft: 36 },
	{ characterCode: '2022', indent: 18 },
	{ characterCode: '2022', marginLeft: 36, indent: 18 },
	// deprecated bullet.code variants (no type, no characterCode)
	{ code: '2022' },
	{ code: '2022', marginLeft: 36 },
	{ code: '2022', indent: 18 },
	// object with no type/characterCode/code — else branch
	{ marginLeft: 36 },
	{ indent: 18 },
	{ marginLeft: 36, indent: 18 },
];

// Non-type bullets (characterCode / code / bare object) that set marginLeft
// or indent intentionally diverge from inline: inline ignored those fields,
// the new functions honor them. These are bug fixes, not regressions — bucket
// them out of the unexpected-mismatch count.
function isExpectedDivergence (bullet: any): boolean {
	if (!bullet || typeof bullet !== 'object') return false;
	if (bullet.type) return false;
	return typeof bullet.marginLeft === 'number' || typeof bullet.indent === 'number';
}

let unexpected = 0;
let expected = 0;
let checked = 0;
const unexpectedLines: string[] = [];
const expectedLines: string[] = [];

for (const indentLevel of indentLevels) {
	for (const bullet of bulletCases) {
		const tpo: any = indentLevel === undefined ? {} : { indentLevel };
		tpo.bullet = bullet;

		const inline = inlineCompute(tpo, bullet);
		if (!inline.emitted) continue;

		const newMarL = calcBulletMargin(tpo, bullet);
		const newIndent = calcBulletIndent(tpo, bullet);
		checked++;

		if (newMarL === inline.marL && newIndent === inline.indent) continue;

		const line =
			`indentLevel=${JSON.stringify(indentLevel)} bullet=${JSON.stringify(bullet)}\n` +
			`         inline: marL=${inline.marL}  indent=${inline.indent}\n` +
			`         new:    marL=${newMarL}  indent=${newIndent}`;

		if (isExpectedDivergence(bullet)) {
			expected++;
			expectedLines.push(line);
		} else {
			unexpected++;
			unexpectedLines.push(line);
		}
	}
}

if (unexpectedLines.length) {
	console.log('=== UNEXPECTED MISMATCHES ===');
	for (const l of unexpectedLines) console.log(l);
}
// if (expectedLines.length) {
// 	console.log('\n=== EXPECTED DIVERGENCES (intentional bug fixes) ===');
// 	for (const l of expectedLines) console.log(l);
// }
console.log(`\n${unexpected} unexpected, ${expected} expected, ${checked - unexpected - expected} clean matches out of ${checked} cases checked.`);
