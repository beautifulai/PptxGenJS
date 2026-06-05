import { ObjectOptions, TextPropsOptions } from '../../core-interfaces';
import { createColorElement, createGlowElement, encodeXmlEntities, genXmlColorSelection, valToPts } from '../../gen-utils';
import { DEF_TEXT_GLOW } from '../../core-enums';

/**
 * Generate XML Text Run Properties (`a:rPr`)
 * @param {ObjectOptions|TextPropsOptions} opts - text options
 * @param {boolean} isDefault - whether these are the default text run properties
 * @return {string} XML
 */
export function generateXml (opts: ObjectOptions | TextPropsOptions, isDefault: boolean): string {
	let runProps = '';
	const runPropsTag = isDefault ? 'a:defRPr' : 'a:rPr';

	// BEGIN runProperties (ex: `<a:rPr lang="en-US" sz="1600" b="1" dirty="0">`)
	runProps += '<' + runPropsTag + ' lang="' + (opts.lang ? opts.lang : 'en-US') + '"' + (opts.lang ? ' altLang="en-US"' : '');
	runProps += opts.fontSize ? ` sz="${Math.round(opts.fontSize * 100)}"` : ''; // NOTE: Use round so sizes like '7.5' wont cause corrupt presentations
	runProps += opts?.bold ? ` b="${opts.bold ? '1' : '0'}"` : '';
	runProps += opts?.italic ? ` i="${opts.italic ? '1' : '0'}"` : '';

	runProps += opts?.strike ? ` strike="${typeof opts.strike === 'string' ? opts.strike : 'sngStrike'}"` : '';
	if (typeof opts.underline === 'object' && opts.underline?.style) {
		runProps += ` u="${opts.underline.style}"`;
	} else if (typeof opts.underline === 'string') {
		// DEPRECATED: opts.underline is an object as of v3.5.0
		runProps += ` u="${String(opts.underline)}"`;
	} else if (opts.hyperlink) {
		runProps += ' u="sng"';
	}
	if (opts.baseline) {
		runProps += ` baseline="${Math.round(opts.baseline * 50)}"`;
	} else if (opts.subscript) {
		runProps += ' baseline="-40000"';
	} else if (opts.superscript) {
		runProps += ' baseline="30000"';
	}
	runProps += opts.charSpacing ? ` spc="${Math.round(opts.charSpacing * 100)}" kern="0"` : ''; // IMPORTANT: Also disable kerning; otherwise text won't actually expand
	runProps += ' dirty="0">';
	// Color / Font / Highlight / Outline are children of <a:rPr>, so add them now before closing the runProperties tag
	if (opts.color || opts.fontFace || opts.outline || (typeof opts.underline === 'object' && opts.underline.color)) {
		if (opts.outline && typeof opts.outline === 'object') {
			runProps += `<a:ln w="${valToPts(opts.outline.size || 0.75)}">${genXmlColorSelection(opts.outline.color || 'FFFFFF')}</a:ln>`;
		}
		if (opts.color) runProps += genXmlColorSelection({ color: opts.color, transparency: opts.transparency });
		if (opts.highlight) runProps += `<a:highlight>${createColorElement(opts.highlight)}</a:highlight>`;
		if (typeof opts.underline === 'object' && opts.underline.color) runProps += `<a:uFill>${genXmlColorSelection(opts.underline.color)}</a:uFill>`;
		if (opts.glow) runProps += `<a:effectLst>${createGlowElement(opts.glow, DEF_TEXT_GLOW)}</a:effectLst>`;
		if (opts.fontFace) {
			// NOTE: 'cs' = Complex Script, 'ea' = East Asian (use "-120" instead of "0" - per Issue #174); ea must come first (Issue #174)
			runProps += `<a:latin typeface="${opts.fontFace}" pitchFamily="34" charset="0"/><a:ea typeface="${opts.fontFace}" pitchFamily="34" charset="-122"/><a:cs typeface="${opts.fontFace}" pitchFamily="34" charset="-120"/>`;
		}
	}

	// Hyperlink support
	if (opts.hyperlink) {
		if (typeof opts.hyperlink !== 'object') throw new Error('ERROR: text `hyperlink` option should be an object. Ex: `hyperlink:{url:\'https://github.com\'}` ');
		else if (!opts.hyperlink.url && !opts.hyperlink.slide) throw new Error('ERROR: \'hyperlink requires either `url` or `slide`\'');
		else if (opts.hyperlink.url) {
			// runProps += '<a:uFill>'+ genXmlColorSelection('0000FF') +'</a:uFill>'; // Breaks PPT2010! (Issue#74)
			runProps += `<a:hlinkClick r:id="rId${opts.hyperlink._rId}" invalidUrl="" action="" tgtFrame="" tooltip="${opts.hyperlink.tooltip ? encodeXmlEntities(opts.hyperlink.tooltip) : ''
			}" history="1" highlightClick="0" endSnd="0"${opts.color ? '>' : '/>'}`;
		} else if (opts.hyperlink.slide) {
			runProps += `<a:hlinkClick r:id="rId${opts.hyperlink._rId}" action="ppaction://hlinksldjump" tooltip="${opts.hyperlink.tooltip ? encodeXmlEntities(opts.hyperlink.tooltip) : ''
			}"${opts.color ? '>' : '/>'}`;
		}
		if (opts.color) {
			runProps += ' <a:extLst>';
			runProps += '  <a:ext uri="{A12FA001-AC4F-418D-AE19-62706E023703}">';
			runProps += '   <ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/>';
			runProps += '  </a:ext>';
			runProps += ' </a:extLst>';
			runProps += '</a:hlinkClick>';
		}
	}

	// END runProperties
	runProps += `</${runPropsTag}>`;

	return runProps;
}
