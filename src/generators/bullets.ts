import { PresSlide, SlideLayout, TextBulletProps, TextPropsOptions } from '../core-interfaces';
import { valToPts } from '../gen-utils';
import { BULLET_TYPES, DEF_BULLET_MARGIN } from '../core-enums';
import utils from '../utils';

function _bulletColorXml (bullet: TextBulletProps): string {
	return bullet.color ? `<a:buClr><a:srgbClr val="${bullet.color}"/></a:buClr>` : '';
}

function _bulletSizeXml (bullet: TextBulletProps): string {
	const sizePercent = bullet.sizePercent ? (bullet.sizePercent * 1000) : 100000;

	return `<a:buSzPct val="${sizePercent}"/>`;
}

function bulletBulletXml (bullet: TextBulletProps): string {
	const colorXml = _bulletColorXml(bullet);
	const sizeXml = _bulletSizeXml(bullet);

	return `${colorXml}${sizeXml}<a:buChar char="${BULLET_TYPES.DEFAULT}"/>`;
}

function charBulletXml (bullet: TextBulletProps): string {
	const colorXml = _bulletColorXml(bullet);
	const sizeXml = _bulletSizeXml(bullet);
	// Check value for hex-ness (s/b 4 char hex)
	const isValidCode = bullet.characterCode && /^\d+$/.test(bullet.characterCode);
	if (!isValidCode) {
		console.warn('Warning: `bullet.characterCode should be a 4-digit unicode character (ex: 22AB)`!');
	}
	// NOTE: OOXML uses the unicode character set for Bullets
	// EX: Unicode Character 'BULLET' (U+2022) ==> '<a:buChar char="&#x2022;"/>'
	const char = isValidCode ? `&#x${bullet.characterCode};` : BULLET_TYPES.DEFAULT;
	return `${colorXml}${sizeXml}<a:buChar char="${char}"/>`;
}

function noBulletXml (bullet: TextBulletProps): string {
	return '<a:buNone/>';
}

function checkboxBulletXml (bullet: TextBulletProps, rId: number): string {
	const sizeXml = _bulletSizeXml(bullet);

	return `${sizeXml}<a:buBlip><a:blip r:embed="rId${rId}"/></a:buBlip>`;
}

function numberBulletXml (bullet: TextBulletProps): string {
	const colorXml = _bulletColorXml(bullet);
	const sizeXml = _bulletSizeXml(bullet);

	const bulletType = bullet.numberType || bullet?.style || 'arabicPeriod';
	const bulletStartAt = bullet.numberStartAt || bullet.startAt;
	let strXmlBullet = `${colorXml}${sizeXml}<a:buFont typeface="+mj-lt"/><a:buAutoNum type="${bulletType}"`;
	if (bulletStartAt && typeof bulletStartAt === 'number') {
		strXmlBullet += ` startAt="${bulletStartAt}"`;
	}
	strXmlBullet += '/>';
	return strXmlBullet;
}

export function calcBulletMargin (textPropsOptions: TextPropsOptions, bullet: boolean | TextBulletProps): number {
	if (typeof bullet !== 'boolean' && (typeof bullet !== 'object' || bullet === null)) return 0;
	if (bullet === false) return 0;

	const indentLevel = (typeof textPropsOptions.indentLevel === 'number' && textPropsOptions.indentLevel > 0)
		? textPropsOptions.indentLevel
		: 0;

	const baseMargin = valToPts(
		(typeof bullet === 'object' && typeof bullet.marginLeft === 'number')
			? bullet.marginLeft
			: DEF_BULLET_MARGIN
	);

	const indentIncrement = (typeof bullet === 'object' && typeof bullet.indent === 'number')
		? valToPts(bullet.indent)
		: baseMargin;

	return baseMargin + (indentIncrement * indentLevel);
}

export function calcBulletIndent (textPropsOptions: TextPropsOptions, bullet: boolean | TextBulletProps): number {
	if (typeof bullet !== 'boolean' && (typeof bullet !== 'object' || bullet === null)) return 0;
	if (bullet === false) return 0;

	if (bullet === true) return -calcBulletMargin(textPropsOptions, bullet);

	const baseMargin = valToPts(typeof bullet.marginLeft === 'number' ? bullet.marginLeft : DEF_BULLET_MARGIN);
	const indentIncrement = (typeof bullet.indent === 'number') ? valToPts(bullet.indent) : baseMargin;
	return -indentIncrement;
}

/**
 * Generate XML for Bullet Properties
 */
export function generateXml (textPropsOptions: TextPropsOptions, slide: PresSlide | SlideLayout): { paragraphPropXml: string; strXmlBullet: string } {
	let paragraphPropXml = '';
	let strXmlBullet = '';
	const bullet = textPropsOptions.bullet;
	const bulletMargin = calcBulletMargin(textPropsOptions, bullet);
	let indent: number;

	if (typeof bullet === 'boolean') {
		if (bullet) {
			paragraphPropXml += ` marL="${bulletMargin}" indent="${-bulletMargin}"`;
			strXmlBullet = bulletBulletXml({ });
		} else if (!bullet) {
			// We only add this when the user explicitly asks for no bullet, otherwise, it can override the master defaults!
			paragraphPropXml += ' indent="0" marL="0"'; // FIX: ISSUE#589 - specify zero indent and marL or default will be hanging paragraph
			strXmlBullet = noBulletXml({});
		}
	} else if (bullet && typeof bullet === 'object') {
		const indentIncrement = (typeof bullet.indent === 'number') ? valToPts(bullet.indent) : bulletMargin;

		if (bullet.type) {
			const bulletType = bullet.type.toString().toLowerCase();

			let rId: number;
			switch (bulletType) {
				case 'bullet':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${bulletMargin}" indent="${indent}"`;
					strXmlBullet = bulletBulletXml(bullet);
					break;
				case 'char':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${bulletMargin}" indent="${indent}"`;
					strXmlBullet = charBulletXml(bullet);
					break;
				case 'checkbox':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${bulletMargin}" indent="${indent}"`;
					rId = utils.image.addImageRels((slide as PresSlide), { data: bullet.icon });
					strXmlBullet = checkboxBulletXml(bullet, rId);
					break;
				case 'number':
					// indent = 0;
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${bulletMargin}" indent="${indent}"`;
					strXmlBullet = numberBulletXml(bullet);
					break;
				case 'none':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${bulletMargin}" indent="${indent}"`;
					strXmlBullet = noBulletXml(bullet);
					break;
			}
		} else if (bullet.characterCode) {
			paragraphPropXml += ` marL="${bulletMargin}" indent="-${valToPts(DEF_BULLET_MARGIN)}"`;
			strXmlBullet = charBulletXml(bullet);
		} else if (bullet.code) {
			// @deprecated `bullet.code` v3.3.0
			paragraphPropXml += ` marL="${bulletMargin}" indent="-${valToPts(DEF_BULLET_MARGIN)}"`;
			strXmlBullet = charBulletXml(bullet);
		} else {
			paragraphPropXml += ` marL="${bulletMargin}" indent="-${valToPts(DEF_BULLET_MARGIN)}"`;
			strXmlBullet = bulletBulletXml(bullet);
		}
	}
	return {
		paragraphPropXml,
		strXmlBullet,
	};
}
