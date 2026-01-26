import {
	ImageProps,
	PresSlide,
} from '../core-interfaces'
import { getNewRelId, getSmartParseNumber } from '../gen-utils'

/**
 * Validates image props
 * @param props
 * @returns {boolean}
 */
function checkImageProps(props: ImageProps) {
	const strImageData = props.data || '';
	const strImagePath = props.path || '';

	if (!strImagePath && !strImageData) {
		console.error('ERROR: addImage() requires either \'data\' or \'path\' parameter!');
		return false;
	} else if (strImagePath && typeof strImagePath !== 'string') {
		console.error(`ERROR: addImage() 'path' should be a string, ex: {path:'/img/sample.png'} - you sent ${String(strImagePath)}`);
		return false;
	} else if (strImageData && typeof strImageData !== 'string') {
		console.error(`ERROR: addImage() 'data' should be a string, ex: {data:'image/png;base64,NMP[...]'} - you sent ${String(strImageData)}`);
		return false;
	} else if (strImageData && typeof strImageData === 'string' && !strImageData.toLowerCase().includes('base64,')) {
		console.error('ERROR: Image `data` value lacks a base64 header! Ex: \'image/png;base64,NMP[...]\')');
		return false;
	}

	return true;
}

/**
 * Generate a short hash string from input data (for deduplicating base64 images)
 * Uses djb2 algorithm - fast, deterministic, and produces reasonably distributed values
 * @param {string} str - input string to hash
 * @returns {string} 8-character hex hash
 */
function hashImageData (str: string): string {
	let hash1 = 5381
	let hash2 = 52711

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash1 = ((hash1 << 5) + hash1) ^ char
		hash2 = ((hash2 << 5) + hash2) ^ char
	}

	// Combine both hashes and convert to unsigned 32-bit, then to hex
	const combined = (hash1 >>> 0) ^ (hash2 >>> 0)
	return combined.toString(16).padStart(8, '0')
}

/**
 * @returns {string}
 */
function imageExtension(props: ImageProps){
	const strImageData = props.data || '';
	const strImagePath = props.path || '';
	// NOTE: Split to address URLs with params (eg: `path/brent.jpg?someParam=true`)
	let strImgExtn = (
		strImagePath
			.substring(strImagePath.lastIndexOf('/') + 1)
			.split('?')[0]
			.split('.')
			.pop()
			.split('#')[0] || 'png'
	).toLowerCase()

	// However, pre-encoded images can be whatever mime-type they want (and good for them!)
	if (strImageData && /image\/(\w+);/.exec(strImageData) && /image\/(\w+);/.exec(strImageData).length > 0) {
		strImgExtn = /image\/(\w+);/.exec(strImageData)[1]
	} else if (strImageData?.toLowerCase().includes('image/svg+xml')) {
		strImgExtn = 'svg'
	}

	return strImgExtn;
}

function imageRelTarget(props: ImageProps){
	const imageHash = (props.data && typeof props.data === 'string' && props.data.length > 0)
			? hashImageData(props.data)
			: hashImageData(props.path || '');
	return `../media/image-${imageHash}`
}

/**
 * If the image already exists, return the existing relationship so that we can avoid duplication
 * @param target
 * @param props
 * @returns { ISlideRelMedia }
 */

function existingImageRel(target: PresSlide, props: ImageProps) {
	const strImgExtn = imageExtension(props);
	const imageTarget = `${imageRelTarget(props)}.${strImgExtn}`

	return target._relsMedia.find(item => item.Target === imageTarget);
}

/**
 * Adds the image relationships to the slide media rels folder
 * @returns {number} rId that is used to link the image on the slide to the image in the media folder
 */
function addImageRels(target: PresSlide, props: ImageProps) {
	const strImageData = props.data || '';
	const strImagePath = props.path || '';
	const strImgExtn = imageExtension(props);

	const existingRel = existingImageRel(target, props);

	if (existingRel) {
		return existingRel.rId;
	} else {
		let imageRelId = getNewRelId(target);

		// STEP 4: Add this image to this Slide Rels (rId/rels count spans all slides! Count all images to get next rId)
		if (strImgExtn === 'svg') {
			// SVG files consume *TWO* rId's: (a png version and the svg image)
			// <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
			// <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.svg"/>
			target._relsMedia.push({
				path: strImagePath || strImageData + 'png',
				type: 'image/png',
				extn: 'png',
				data: strImageData || '',
				rId: imageRelId,
				Target: `${imageRelTarget(props)}.png`,
				isSvgPng: true,
				svgSize: {
					w: getSmartParseNumber(props.w || 1, 'X', target._presLayout),
					h: getSmartParseNumber(props.h || 1, 'Y', target._presLayout)
				},
			})
			imageRelId = imageRelId + 1;
			target._relsMedia.push({
				path: strImagePath || strImageData,
				type: 'image/svg+xml',
				extn: strImgExtn,
				data: strImageData || '',
				rId: imageRelId,
				Target:`${imageRelTarget(props)}.${strImgExtn}`,
			})
		} else {
			const dupeItem = target._relsMedia.filter(item =>
				item.path && item.path === strImagePath && item.type === 'image/' + strImgExtn
				&& !item.isDuplicate)[0]

			target._relsMedia.push({
				path: strImagePath || 'preencoded.' + strImgExtn,
				type: 'image/' + strImgExtn,
				extn: strImgExtn,
				data: strImageData || '',
				rId: imageRelId,
				isDuplicate: !!(dupeItem?.Target),
				Target: `${imageRelTarget(props)}.${strImgExtn}`,
			})
		}
		return imageRelId;
	}
}

export const image = {
	addImageRels,
	checkImageProps,
	hashImageData
}
