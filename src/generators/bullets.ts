import { PresSlide, SlideLayout, TextPropsOptions } from '../core-interfaces';
import { valToPts } from '../gen-utils';
import { BULLET_TYPES, DEF_BULLET_MARGIN } from '../core-enums';
import utils from '../utils';

/**
 * Generate XML for Bullet Properties
 */

export function generateXml (textPropsOptions: TextPropsOptions, slide: PresSlide | SlideLayout) {
	let paragraphPropXml = '';
	let strXmlBullet = '';
	let defaultMarL = valToPts(DEF_BULLET_MARGIN);
	const bullet = textPropsOptions.bullet;
	let indent: number;

	// NOTE: OOXML uses the unicode character set for Bullets
	// EX: Unicode Character 'BULLET' (U+2022) ==> '<a:buChar char="&#x2022;"/>'

	if (typeof bullet === 'boolean') {
		if (bullet) {
			defaultMarL = textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0
				? defaultMarL + defaultMarL * textPropsOptions.indentLevel
				: defaultMarL;
			indent = -defaultMarL;
			paragraphPropXml += ` marL="${defaultMarL}" indent="${indent}"`;
			strXmlBullet = `<a:buSzPct val="100000"/><a:buChar char="${BULLET_TYPES.DEFAULT}"/>`;
		} else if (!bullet) {
			// We only add this when the user explicitly asks for no bullet, otherwise, it can override the master defaults!
			paragraphPropXml += ' indent="0" marL="0"'; // FIX: ISSUE#589 - specify zero indent and marL or default will be hanging paragraph
			strXmlBullet = '<a:buNone/>';
		}
	} else if (bullet && typeof bullet === 'object') {
		const color = bullet.color ? `<a:buClr><a:srgbClr val="${bullet.color}"/></a:buClr>` : '';
		const marginLeft = (typeof bullet.marginLeft === 'number') ? valToPts(bullet.marginLeft) : defaultMarL;
		const indentIncrement = (typeof bullet.indent === 'number') ? valToPts(bullet.indent) : marginLeft;

		if (bullet.type) {
			const bulletType = bullet.type.toString().toLowerCase();
			const marL = ((typeof textPropsOptions.indentLevel === 'number') && (textPropsOptions.indentLevel > 0))
				? (marginLeft + (indentIncrement * textPropsOptions.indentLevel))
				: marginLeft;

			let rId: number;
			switch (bulletType) {
				case 'bullet':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${marL}" indent="${indent}"`;
					strXmlBullet = `${color}<a:buSzPct val="100000"/><a:buChar char="${BULLET_TYPES.DEFAULT}"/>`;
					break;
				case 'char':
					const char = bullet.characterCode ? `&#x${bullet.characterCode};` : BULLET_TYPES.DEFAULT;
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${marL}" indent="${indent}"`;
					strXmlBullet = `${color}<a:buSzPct val="100000"/><a:buChar char="${char}"/>`;
					break;
				case 'checkbox':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${marL}" indent="${indent}"`;
					rId = utils.image.addImageRels((slide as PresSlide), { data: bullet.icon });
					strXmlBullet = `<a:buSzPct val="120000"/><a:buBlip><a:blip r:embed="rId${rId}"/></a:buBlip>`;
					break;
				case 'number':
					// indent = 0;
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${marL}" indent="${indent}"`;
					const bulletType = bullet.numberType || bullet?.style || 'arabicPeriod';
					const bulletStartAt = bullet.numberStartAt || bullet.startAt;
					strXmlBullet = `${color}<a:buSzPct val="100000"/><a:buFont typeface="+mj-lt"/><a:buAutoNum type="${bulletType}"`;
					if (bulletStartAt && typeof bulletStartAt === 'number') {
						strXmlBullet += ` startAt="${bulletStartAt}"`;
					}
					strXmlBullet += '/>';
					break;
				case 'none':
					indent = -indentIncrement;
					paragraphPropXml += ` marL="${marL}" indent="${indent}"`;
					strXmlBullet = '<a:buNone/>';
					break;
			}
		} else if (bullet.characterCode) {
			let bulletCode = `&#x${bullet.characterCode};`;

			// Check value for hex-ness (s/b 4 char hex)
			if (!/^[0-9A-Fa-f]{4}$/.test(bullet.characterCode)) {
				console.warn('Warning: `bullet.characterCode should be a 4-digit unicode character (ex: 22AB)`!');
				bulletCode = BULLET_TYPES.DEFAULT;
			}

			paragraphPropXml += ` marL="${textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0 ? defaultMarL + defaultMarL * textPropsOptions.indentLevel : defaultMarL}" indent="-${defaultMarL}"`;
			strXmlBullet = '<a:buSzPct val="100000"/><a:buChar char="' + bulletCode + '"/>';
		} else if (bullet.code) {
			// @deprecated `bullet.code` v3.3.0
			let bulletCode = `&#x${bullet.code};`;

			// Check value for hex-ness (s/b 4 char hex)
			if (!/^[0-9A-Fa-f]{4}$/.test(bullet.code)) {
				console.warn('Warning: `bullet.code should be a 4-digit hex code (ex: 22AB)`!');
				bulletCode = BULLET_TYPES.DEFAULT;
			}

			paragraphPropXml += ` marL="${textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0 ? defaultMarL + defaultMarL * textPropsOptions.indentLevel : defaultMarL
			}" indent="-${defaultMarL}"`;
			strXmlBullet = '<a:buSzPct val="100000"/><a:buChar char="' + bulletCode + '"/>';
		} else {
			paragraphPropXml += ` marL="${textPropsOptions.indentLevel && textPropsOptions.indentLevel > 0 ? defaultMarL + defaultMarL * textPropsOptions.indentLevel : defaultMarL
			}" indent="-${defaultMarL}"`;
			strXmlBullet = `<a:buSzPct val="100000"/><a:buChar char="${BULLET_TYPES.DEFAULT}"/>`;
		}
	}
	return {
		paragraphPropXml,
		strXmlBullet,
	};
}
