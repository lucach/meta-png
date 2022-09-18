# meta-png
[![NPM version](https://badge.fury.io/js/meta-png.svg)](https://www.npmjs.com/package/meta-png)
[![codecov](https://codecov.io/gh/lucach/meta-png/branch/main/graph/badge.svg?token=ZGEFAO5WDP)](https://codecov.io/gh/lucach/meta-png)
![Test](https://github.com/lucach/meta-png/workflows/Test/badge.svg)
![Lint](https://github.com/lucach/meta-png/workflows/Lint/badge.svg)

Simple, zero-dependencies NodeJS/JavaScript library to store and retrieve metadata in PNG files.

## Installation
Use your favourite package manager 
```bash
npm install meta-png
# or: yarn add meta-png
```

## Usage
The library provides two functions to add a new metadata:

```javascript
addMetadata(PNGUint8Array, key, value)  // stores the given key-value inside the PNG, provided as Uint8Array
addMetadataFromBase64DataURI(dataURI, key, value)  // stores the given key-value inside the PNG, provided as a Data URL string
```

and a function to get back the stored value:

```javascript
getMetadata(PNGUint8Array, key)  // retrives the given key from a PNG provided as Uint8Array
```

## Limitations
- tEXt chunks inside PNG files are meant to use the Latin-1 standard: using characters outside this charset may lead to unwanted behaviors
- No check is performed inside add functions to test whether a given key is already present in the file. If you need it, you can call `getMetadata` beforehand and assert that it gives back `undefined`.
