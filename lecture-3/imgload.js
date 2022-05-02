export function getFilePaths() {
    return [
        "HEAD_BRAIN.img",
        "BRAIN_MR.img",
        "avg.img",
    ];
}

export async function imgload(url) {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer();
    const bufferArray = new Uint8Array(buffer)

    let img;

    if (url === "HEAD_BRAIN.img") {
        img = {
            rows: 256,
            columns: 216,
            slices: 32,
            pixelSpacingX: 0.9,
            pixelSpacingY: 0.9,
            pixelSpacingZ: 5,
            pixelData: []
        };
        img.pixelData = new Uint16Array(bufferArray.buffer, 0, img.rows * img.columns * img.slices);
    }
    else if (url === "BRAIN_MR.img") {
        img = {
            rows: 256,
            columns: 192,
            slices: 192,
            pixelSpacingX: 1,
            pixelSpacingY: 1,
            pixelSpacingZ: 1,
            pixelData: []
        };
        img.pixelData = new Uint16Array(bufferArray.buffer, 0, img.rows * img.columns * img.slices);
    } else if (url === "avg.img") {
        img = {
            rows: 109,
            columns: 91,
            slices: 91,
            pixelSpacingX: 2,
            pixelSpacingY: 2,
            pixelSpacingZ: 2,
            pixelData: []
        };
        img.pixelData = new Uint8Array(bufferArray.buffer, 0, img.rows * img.columns * img.slices);
    }
    else {
        throw new Error("Unsupported file");
    }

    return parseByteArray(img);
}

function parseByteArray(img) {
    try {
        var l = img.pixelData.length;
        var fa = new Float32Array(l);
        for (var i = 0; i < l; i++) {
            fa[i] = img.pixelData[i];
        }

        img.pixelData = fa;
        return img;
    }
    catch (err) {
        // we catch the error and display it to the user
        alert(err);
    }
}