import { BULLET_TYPES, DEF_BULLET_MARGIN } from '../core-enums';
import { PresSlide, SlideLayout, TextBulletProps, TextPropsOptions } from '../core-interfaces';
import { valToPts } from '../gen-utils';
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

function checkboxBulletXml (bullet: TextBulletProps, rId: number | null): string {
	const sizeXml = _bulletSizeXml(bullet);
	const blipXml = rId ? `<a:buBlip><a:blip r:embed="rId${rId}"/></a:buBlip>` : '';

	return `${sizeXml}${blipXml}`;
}

function iconBulletXml (bullet: TextBulletProps, rId: number | null): string {
	const sizeXml = _bulletSizeXml(bullet);
	const blipXml = rId ? `<a:buBlip><a:blip r:embed="rId${rId}"/></a:buBlip>` : '';

	return `${sizeXml}${blipXml}`;
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
	if (typeof bullet !== 'boolean' && (typeof bullet !== 'object' || bullet === null)) {
		return 0;
	}

	if (bullet === false) {
		return 0;
	}

	if (bullet === true) {
		return (-calcBulletMargin(textPropsOptions, bullet));
	}

	const baseMargin = valToPts(typeof bullet.marginLeft === 'number' ? bullet.marginLeft : DEF_BULLET_MARGIN);
	const indentIncrement = (typeof bullet.indent === 'number') ? valToPts(bullet.indent) : baseMargin;
	return -indentIncrement;
}

export function paragraphPropXml (textPropsOptions: TextPropsOptions): string {
	const bullet = textPropsOptions.bullet;
	const bulletMargin = calcBulletMargin(textPropsOptions, bullet);
	const bulletIndent = calcBulletIndent(textPropsOptions, bullet);
	return ` marL="${bulletMargin}" indent="${bulletIndent}"`;
}

export function maybeAddImageRel (textPropsOptions: TextPropsOptions, slide: PresSlide): number | null {
	const bullet = (textPropsOptions.bullet as TextBulletProps);

	if (bullet && typeof bullet === 'object' && bullet.icon) {
		return utils.image.addImageRels((slide), { data: bullet.icon });
	}

	return null;
}

/**
 * Generate XML for Bullet Properties
 * May also mutate the slide
 */
export function generateXml (textPropsOptions: TextPropsOptions, slide: PresSlide | SlideLayout, imageRid: number | null): string {
	const bullet = textPropsOptions.bullet;

	if (typeof bullet === 'boolean') {
		if (bullet) {
			return bulletBulletXml({});
		} else if (!bullet) {
			return noBulletXml({});
		}
	} else if (bullet && typeof bullet === 'object') {
		if (bullet.type) {
			const bulletType = bullet.type.toString().toLowerCase();

			switch (bulletType) {
				case 'bullet':
					return bulletBulletXml(bullet);
				case 'char':
					return charBulletXml(bullet);
				case 'checkbox':
					return checkboxBulletXml(bullet, imageRid);
				case 'icon':
					return iconBulletXml(bullet, imageRid);
				case 'number':
					return numberBulletXml(bullet);
				case 'none':
					return noBulletXml(bullet);
			}
		} else if (bullet.characterCode) {
			return charBulletXml(bullet);
		} else if (bullet.code) {
			// @deprecated `bullet.code` v3.3.0
			return charBulletXml(bullet);
		}
		return bulletBulletXml(bullet);
	}
}
