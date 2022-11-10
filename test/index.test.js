const fs = require('fs');
const exifr = require('exifr');
const { addMetadata } = require('../src/main');
const { addMetadataFromBase64DataURI } = require('../src/main');
const { getMetadata } = require('../src/main');

global.TextEncoder = require('util').TextEncoder;

test('Stores simple data (from ArrayBuffer)', async () => {
  const PNGUint8Array = new Uint8Array(fs.readFileSync('./test/sample.png'));
  const PNGModified = addMetadata(PNGUint8Array, 'foo', 'bar');
  const parsedTags = await exifr.parse(PNGModified);
  expect(parsedTags.foo).toBe('bar');
});

test('Stores simple data (from base64 Data URI)', async () => {
  const dataURI = fs.readFileSync('./test/samplePNGDataURI.txt', 'utf-8');
  const modifiedDataURI = addMetadataFromBase64DataURI(dataURI, 'foo', 'bar');
  const prefix = 'data:image/png;base64,';
  expect(modifiedDataURI.startsWith(prefix)).toBe(true);
  const array = new Uint8Array(Buffer.from(modifiedDataURI.substring(prefix.length), 'base64'));
  const parsedTags = await exifr.parse(array);
  expect(parsedTags.foo).toBe('bar');
});

test('Rejects to write on invalid PNG', () => {
  const arrayBuffer = new Uint8Array(fs.readFileSync('./test/sample.jpg'));
  expect(() => addMetadata(arrayBuffer, 'foo', 'bar')).toThrow('Invalid PNG');
});

test('Rejects without crashing a small invalid PNG', () => {
  const arrayBuffer = new Uint8Array([0]);
  expect(() => addMetadata(arrayBuffer, 'foo', 'bar')).toThrow('Invalid PNG');
});

test('Rejects to write on invalid Data URI', () => {
  const dataURI = fs.readFileSync('./test/sampleGIFDataURI.txt', 'utf-8');
  expect(() => addMetadataFromBase64DataURI(dataURI, 'foo', 'bar')).toThrow('Invalid PNG as Base64 Data URI');
});

test('Rejects to read from invalid PNG', () => {
  const arrayBuffer = new Uint8Array(fs.readFileSync('./test/sample.jpg'));
  expect(() => getMetadata(arrayBuffer, 'foo')).toThrow('Invalid PNG');
});

test('Rejects too short or too long key', () => {
  const arrayBuffer = new Uint8Array(fs.readFileSync('./test/sample.png'));
  const key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  expect(() => addMetadata(arrayBuffer, key, 'foo')).toThrow('Invalid length for key');
  expect(() => addMetadata(arrayBuffer, '', 'foo')).toThrow('Invalid length for key');
});

test('Read simple data', () => {
  const PNGUint8Array = new Uint8Array(fs.readFileSync('./test/samplewithmeta.png'));
  const metadataValue = getMetadata(PNGUint8Array, 'foo');
  expect(metadataValue).toBe('bar');
});

test('Read non-existent key', () => {
  const PNGUint8Array = new Uint8Array(fs.readFileSync('./test/samplewithmeta.png'));
  const metadataValue = getMetadata(PNGUint8Array, 'foofoo');
  expect(metadataValue).toBe(undefined);
});

test('Store and read short data', async () => {
  const PNGUint8Array = new Uint8Array(fs.readFileSync('./test/sample.png'));
  const key = 'pangram';
  const value = 'The quick brown fox jumps over the lazy dog';
  const PNGModified = addMetadata(PNGUint8Array, key, value);
  const parsedTags = await exifr.parse(PNGModified);
  expect(parsedTags[key]).toBe(value);
  const metadataValue = getMetadata(PNGModified, key);
  expect(metadataValue).toBe(value);
});

test('Store and read long JSON data', async () => {
  const PNGUint8Array = new Uint8Array(fs.readFileSync('./test/sample.png'));
  const key = 'json';
  let veryLongString = '1234567890';
  for (let i = 0; i < 10; i += 1) {
    veryLongString += veryLongString + veryLongString;
  }
  // veryLongString is ~ 590kB
  const value = JSON.stringify({ foo: veryLongString });
  const PNGModified = addMetadata(PNGUint8Array, key, value);
  const parsedTags = await exifr.parse(PNGModified);
  expect(parsedTags[key]).toBe(value);
  const metadataValue = getMetadata(PNGModified, key);
  expect(metadataValue).toBe(value);
});
