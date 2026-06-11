import { ISlideObject, PresSlide, SlideLayout, TextProps } from '../core-interfaces';
import * as bullet from './bullet';
import { inch2Emu } from '../gen-utils';
import textRun from './textRun';

/**
 * Generate XML Text Run Properties (`a:rPr`)
 * @param {ObjectOptions|TextPropsOptions} opts - text options
 * @param {boolean} isDefault - whether these are the default text run properties
 * @return {string} XML
 */
export function generateXml (textObj: ISlideObject | TextProps, isDefault: boolean, slide: PresSlide | SlideLayout): string {
	let strXmlBullet = '';
	let strXmlLnSpc = '';
	let strXmlParaSpc = '';
	let strXmlTabStops = '';
	const tag = isDefault ? 'a:lvl1pPr' : 'a:pPr';

	let paragraphPropXml = `<${tag} fontAlgn="ctr" ${textObj.options.rtlMode ? 'rtl="1" ' : ''}`;

	// A: Build paragraphProperties
	{
		// OPTION: align
		if (textObj.options.align) {
			switch (textObj.options.align) {
				case 'left':
					paragraphPropXml += ' algn="l"';
					break;
				case 'right':
					paragraphPropXml += ' algn="r"';
					break;
				case 'center':
					paragraphPropXml += ' algn="ctr"';
					break;
				case 'justify':
					paragraphPropXml += ' algn="just"';
					break;
				default:
					paragraphPropXml += '';
					break;
			}
		}

		if (textObj.options.lineSpacing) {
			strXmlLnSpc = `<a:lnSpc><a:spcPts val="${Math.round(textObj.options.lineSpacing * 100)}"/></a:lnSpc>`;
		} else if (textObj.options.lineSpacingMultiple) {
			strXmlLnSpc = `<a:lnSpc><a:spcPct val="${Math.round(textObj.options.lineSpacingMultiple * 100000)}"/></a:lnSpc>`;
		}

		// OPTION: indent
		if (textObj.options.indentLevel && !isNaN(Number(textObj.options.indentLevel)) && textObj.options.indentLevel > 0) {
			paragraphPropXml += ` lvl="${textObj.options.indentLevel}"`;
		}

		// OPTION: Paragraph Spacing: Before/After
		if (textObj.options.paraSpaceBefore && !isNaN(Number(textObj.options.paraSpaceBefore)) && textObj.options.paraSpaceBefore > 0) {
			strXmlParaSpc += `<a:spcBef><a:spcPts val="${Math.round(textObj.options.paraSpaceBefore * 100)}"/></a:spcBef>`;
		}
		if (textObj.options.paraSpaceAfter && !isNaN(Number(textObj.options.paraSpaceAfter)) && textObj.options.paraSpaceAfter > 0) {
			strXmlParaSpc += `<a:spcAft><a:spcPts val="${Math.round(textObj.options.paraSpaceAfter * 100)}"/></a:spcAft>`;
		}

		// OPTION: bullet
		if (textObj.options.bullet) {
			// The slide will be mutated and a new image rel added when the bullet includes a new icon
			//
			const imageRid = bullet.maybeAddImageRel(textObj.options, (slide as PresSlide));
			const bulletXml = bullet.generateXml(textObj.options, slide, imageRid);
			paragraphPropXml += bullet.paragraphPropXml(textObj.options);
			strXmlBullet = bulletXml;
		}

		// OPTION: tabStops
		if (textObj.options.tabStops && Array.isArray(textObj.options.tabStops)) {
			const tabStopsXml = textObj.options.tabStops.map(stop => `<a:tab pos="${inch2Emu(stop.position || 1)}" algn="${stop.alignment || 'l'}"/>`).join('');
			strXmlTabStops = `<a:tabLst>${tabStopsXml}</a:tabLst>`;
		}

		// B: Close Paragraph-Properties
		// IMPORTANT: strXmlLnSpc, strXmlParaSpc, and strXmlBullet require strict ordering - anything out of order is ignored. (PPT-Online, PPT for Mac)
		paragraphPropXml += '>' + strXmlLnSpc + strXmlParaSpc + strXmlBullet + strXmlTabStops;
		if (isDefault) paragraphPropXml += textRun.properties.generateXml(textObj.options, true);
		paragraphPropXml += '</' + tag + '>';
	}

	return paragraphPropXml;
}
