/**
 * Packs a number into a 4 bytes Uint8Array, treating it as uint32.
 *
 * @param {number} n - The number to convert
 * @returns {Uint8Array} - The array
*/
function packNumberAs4Bytes(n) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, n);
  return new Uint8Array(view.buffer);
}

/**
 * Return a string from a DataView, starting from a certain offset, up to length bytes.
 *
 * @param {DataView} view - The source DataView
 * @param {number=} offset - The offset from which to start reading the DataView
 * @param {number=} length - The maximum number of bytes to read
 *
 * @returns {string} - A string containing the interpetation of the values in the view.
*/
function dataViewToString(view, offset = 0, length = view.byteLength) {
  let res = '';
  const maxLength = Math.min(length, view.byteLength - offset);
  for (let i = 0; i < maxLength; i += 1) {
    res += String.fromCharCode(view.getUint8(offset + i));
  }
  return res;
}

/**
 * Encodes a string (UTF-8) into an array of bytes.
 *
 * @param {string} s - The string to encode
 * @returns {Uint8Array} - The resulting array containing the encoded string.
*/
function encodeString(s) {
  return new TextEncoder().encode(s);
}

/**
 * Concatenates (joins) a sequence of Uint8Arrays.
 *
 * @param {Uint8Array[]} arrays - An array of Uint8Arrays to be concatenated in order.
 * @returns {Uint8Array} - The resulting concatenated array.
*/
function concatArrays(arrays) {
  const length = arrays.reduce((prev, array) => prev + array.byteLength, 0);
  const finalArray = new Uint8Array(length);
  for (let i = 0, lenSoFar = 0; i < arrays.length; i += 1) {
    finalArray.set(arrays[i], lenSoFar);
    lenSoFar += arrays[i].byteLength;
  }
  return finalArray;
}

/**
 * Returns a dataview on the entire the TypedArray/Buffer.
 * We need to be very careful here, because the are subtle incompatibilities
 * between JavaScript TypedArrays and Node.js Buffers.
 * A Buffer might not start from a zero offset on the underlying ArrayBuffer.
 * Using byteOffset, even when `array` is using only a portion of the
 * underlying ArrayBuffer (e.g., for optimization purposes with small arrays),
 * we still get a view on the right values.
 * See https://nodejs.org/api/buffer.html#bufbyteoffset
 * @param {Uint8Array} array - The array to get a DataView on.
 * @returns {DataView} - A DataView on the array.
 */
function getDataView(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}

/**
 * Checks whether a given array has a valid PNG header.
 *
 * @param {Uint8Array} array - The array to check.
 * @returns {boolean} - true if array has a valid PNG header, false otherwise.
*/
function isPNG(array) {
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  if (array.length < pngSignature.length) {
    return false;
  }
  return getDataView(pngSignature).getBigUint64() === getDataView(array).getBigUint64();
}

/**
 * Adds in a tEXt chunk of a PNG file a metadata with the given key and value.
 * Warning: this function does not check whether the supplied key already exists.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @param {string} value - Value of the metadata to be set.
 * @returns {Uint8Array} - Array containing bytes of a PNG file with metadata.
*/
export function addMetadata(PNGUint8Array, key, value) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  if (key.length < 1 || key.length > 79) {
    throw new TypeError('Invalid length for key');
  }

  // Prepare tEXt chunk to insert
  const chunkType = encodeString('tEXt');
  const chunkData = encodeString(`${key}\0${value}`);
  const chunkCRC = packNumberAs4Bytes(0); // dummy CRC
  const chunkDataLen = packNumberAs4Bytes(chunkData.byteLength);
  const chunk = concatArrays([chunkDataLen, chunkType, chunkData, chunkCRC]);

  // Compute header (IHDR) length
  const headerDataLenOffset = 8;
  const headerDataLen = getDataView(PNGUint8Array).getUint32(headerDataLenOffset);
  const headerLen = 8 + 4 + 4 + headerDataLen + 4;

  // Assemble new PNG
  const head = PNGUint8Array.subarray(0, headerLen);
  const tail = PNGUint8Array.subarray(headerLen);
  return concatArrays([head, chunk, tail]);
}

/**
 * Adds in a tEXt chunk of a PNG file a metadata with the given key and value.
 * Warning: this function does not check whether the supplied key already exists.
 *
 * @param {string} dataURI - Data URL (staring with 'data:image/png;base64,')
 *                           containing a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @param {string} value - Value of the metadata to be set.
 * @returns {string} - Data URL with a base64 encoded PNG file with metadata.
*/
export function addMetadataFromBase64DataURI(dataURI, key, value) {
  const prefix = 'data:image/png;base64,';
  if (typeof dataURI !== 'string' || dataURI.substring(0, prefix.length) !== prefix) {
    throw new TypeError('Invalid PNG as Base64 Data URI');
  }
  const dataStr = atob(dataURI.substring(prefix.length));
  const PNGUint8Array = new Uint8Array(dataStr.length);
  for (let i = 0; i < dataStr.length; i += 1) {
    PNGUint8Array[i] = dataStr.charCodeAt(i);
  }
  const newPNGUint8Array = addMetadata(PNGUint8Array, key, value);
  return prefix + btoa(dataViewToString(getDataView(newPNGUint8Array)));
}

/**
 * Retrieves (if present) a metadata with the given key contained in a tEXt chunk
 * of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @returns {string|undefined} - A string containing the extracted value or undefined if it could
 *                               not be found.
*/
export function getMetadata(PNGUint8Array, key) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  const view = getDataView(PNGUint8Array);
  let offset = 8;
  while (offset < view.byteLength) {
    const chunkLength = view.getUint32(offset);
    if (dataViewToString(view, offset + 4, 4 + key.length) === `tEXt${key}`) {
      return dataViewToString(view, offset + 4 + 4 + key.length + 1, chunkLength - key.length - 1);
    }
    offset += chunkLength + 12; // skip 4 bytes of chunkLength, 4 of chunkType, 4 of CRC
  }
  return undefined;
}
